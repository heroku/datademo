require 'logger'
require 'sinatra/base'
require 'sinatra/json'
require 'sinatra/namespace'
require 'sinatra/reloader'

class HerokuConnectDataDemoApplication < Sinatra::Base

  COUNTRY_CODES = {
    'Austria' => 'at',
    'Belgium' => 'be',
    'France' => 'fr',
    'Germany' => 'de',
    'Ireland' => 'ie',
    'Italy' => 'it',
    'Netherlands' => 'nl',
    'Poland' => 'pl',
    'Spain' => 'es',
    'Turkey' => 'tr',
    'United Kingdom' => 'gb'
  }.freeze

  configure do
    register Sinatra::Namespace

    set :raise_errors, true
    set :show_exceptions, false

    set :database, Sequel.connect(ENV['DATABASE_URL'], logger: Logger.new($stdout))
  end

  configure :development do
    register Sinatra::Reloader
  end

  helpers do
    def database
      settings.database
    end
    
    def account_from_record(record)
      unless record.nil?
        {
          count: record[:count].to_i,
          country: record[:billingcountry].to_s,
          country_code: COUNTRY_CODES[record[:billingcountry].to_s],
          latitude: record[:billinglatitude].to_f,
          longitude: record[:billinglongitude].to_f
        }
      else
        {}
      end
    end

    def user_from_record(record)
      {
        id: record[:account_manager_id].to_i,
        accounts: [],
        country: record[:account_manager_country].to_s,
        country_code: COUNTRY_CODES[record[:account_manager_country].to_s],
        latitude: record[:account_manager_latitude].to_f,
        longitude: record[:account_manager_longitude].to_f,
        fullname: [record[:account_manager_firstname], record[:account_manager_lastname]].join(' ')
      }
    end
  end
  
  def summary_query
    database[:salesforce__account_manager__c].
    select {
      [
        Sequel.lit('salesforce.account_manager__c.id').as(:account_manager_id),
        Sequel.lit('salesforce.account_manager__c.country__c').as(:account_manager_country),
        Sequel.lit('salesforce.account_manager__c.firstname__c').as(:account_manager_firstname),
        Sequel.lit('salesforce.account_manager__c.lastname__c').as(:account_manager_lastname),
        Sequel.lit('salesforce.account_manager__c.location__latitude__s').as(:account_manager_latitude),
        Sequel.lit('salesforce.account_manager__c.location__longitude__s').as(:account_manager_longitude),
        :account_summary__billingcountry,
        :account_summary__billinglatitude,
        :account_summary__billinglongitude,
        :account_summary__count              
      ]
    }. 
    left_outer_join(
      database[:salesforce__account].
      select_group(
        Sequel.lit('account_manager__r__external_id__c'),
        :billingcountry
      ).
      select_append{
        [
          count(:billingcountry).as(:count),
          max(:billinglatitude).as(:billinglatitude),
          max(:billinglongitude).as(:billinglongitude)
        ]
      },
      { Sequel.lit('account_manager__r__external_id__c') => Sequel.lit('external_id__c') },
      { table_alias: :account_summary }).
    order(:account_manager_lastname, :account_manager_firstname)
  end
  
  def summary_from_records(sql)
    summary = sql.map.each_with_object({}) do |record, memo|
      memo[record[:account_manager_id]] ||= user_from_record(record)
      memo[record[:account_manager_id]][:accounts] << account_from_record(record) unless record[:count].to_i.zero?
    end.values

    summary.each do |s|
      s[:accounts].sort! { |a, b| a[:country] <=> b[:country] }
    end
    
    summary
  end

  namespace '/api' do
    get '/countries/:country_code' do
      country_code = params[:country_code].to_s.downcase
      country = COUNTRY_CODES.key(country_code)
      halt(404) if country.nil?

      record = database[:salesforce__account].
        select_group(:billingcountry).
        select_append{
          [
            count(:billingcountry).as(:count),
            max(:billinglatitude).as(:billinglatitude),
            max(:billinglongitude).as(:billinglongitude)
          ]
        }.
        where(billingcountry: country).first

      json(account_from_record(record))
    end

    # get summary of all users and accounts
    get '/users' do      
      users = summary_from_records(summary_query)
      users ? json(users: users) : halt(404)
    end
    
    # get summary for a single user - specify unique db id
    get '/users/:id' do
      user = summary_from_records(summary_query.where(id: params[:id])).first
      user ? json(user) : halt(404)
    end

    # update the accounts - map onto the user targetted - specify unique db id
    post '/users/:id' do
      user_external_id = database[:salesforce__account_manager__c].where(id: params[:id]).get(Sequel.lit('external_id__c'))
      country = COUNTRY_CODES.key(params[:country_code].to_s.downcase)

      halt(404) if user_external_id.nil? || country.nil?

      database[:salesforce__account].where(billingcountry: country).update(Sequel.lit('account_manager__r__external_id__c') => user_external_id)
      status(200)
    end
  end

  error do
    json(message: env['sinatra.error'].message)
  end

  not_found do
    json(message: 'not found')
  end

end
