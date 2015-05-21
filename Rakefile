require 'active_support/all'
require 'csv'
require 'logger'
require 'sequel'
require 'securerandom'

COUNTRY_LOOKUP = {
  'Austria' => [ 47.3333333333, 13.3333333333 ],
  'Belgium' => [ 50.8333333333, 4.0 ],
  'France' => [ 46.0, 2.0 ],
  'Germany' => [ 51.0, 9.0 ],
  'Ireland' => [ 53.0, -8.0 ],
  'Italy' => [ 42.8333333333, 12.8333333333 ],
  'Netherlands' => [ 52.5, 5.75 ],
  'Poland' => [ 52.0, 20.0 ],
  'Spain' => [ 40.0, -4.0 ],
  'Turkey' => [ 39.0, 35.0 ],
  'United Kingdom' => [ 54.0, -2.0 ]
}.freeze

if Gem::Specification.find_all_by_name('dotenv').any?
  require 'dotenv'
  Dotenv.load
end

database = Sequel.connect(ENV['DATABASE_URL'], logger: Logger.new($stdout))

account_manager_table = database[:salesforce__account_manager__c]
account_table = database[:salesforce__account]

namespace :database do

  desc 'Delete previous dataset'
  task :delete_data do
    puts "Deleting previous dataset"
    
    puts "  Deleting account managers"
    account_manager_table.where('created_by_automaton__c is true').delete
    
    puts "  Deleting accounts"
    account_table.where('created_by_automaton__c is true').delete
    
    puts "  Done"
  end
  
  desc 'Insert dataset'
  task :insert_data do
    puts "Insert dataset"

    country_account_manager_external_ids = {}

    puts "  Inserting account managers"
    CSV.foreach('data/account_managers.csv', headers: :first_row) do |account_manager|
      uuid = SecureRandom.uuid
      
      record = {
        'country__c' => account_manager['country'],
        'firstname__c' => account_manager['given_name'],
        'lastname__c' => account_manager['family_name'],
        'location__latitude__s' => COUNTRY_LOOKUP[account_manager['country']].first,
        'location__longitude__s' => COUNTRY_LOOKUP[account_manager['country']].last,
        'created_by_automaton__c' => true,
        'external_id__c' => uuid
      }
      
      country_account_manager_external_ids[account_manager['country']] = uuid
      account_manager_table.insert(record)
    end
    
    puts "  Inserting accounts"
    # TODO: provide better way of selecting dataset
    [ 'accounts_100' ].each do |account_source|
      CSV.foreach("data/#{account_source}.csv", headers: :first_row).map do |account|
        {
          'billingcountry' => account['billing_country'],
          'billinglatitude' => COUNTRY_LOOKUP[account['billing_country']].first,
          'billinglongitude' => COUNTRY_LOOKUP[account['billing_country']].last,
          'name' => account['account_name'],
          'account_manager__r__external_id__c' => country_account_manager_external_ids[account['billing_country']],
          'created_by_automaton__c' => true
        }
      end.in_groups_of(500) do |records|
        account_table.multi_insert(records)
      end
    end
    
    puts "  Done"
  end

  desc 'Configure the database with a fresh set of data'
  task :configure do
    puts "Configuring Database"
    
    Rake::Task['database:insert_data'].execute

    puts "Done"
  end

end