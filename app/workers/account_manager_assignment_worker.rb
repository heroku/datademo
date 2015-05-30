class AccountManagerAssignmentWorker
  include Sidekiq::Worker
  include Sidekiq::Status::Worker
  
  sidekiq_options retry: 'false'
  
  def perform(country, user_external_id)
    database = Sequel.connect(ENV['DATABASE_URL'], logger: Logger.new($stdout))
    database[:salesforce__account].where(billingcountry: country).update(Sequel.lit('account_manager__r__external_id__c') => user_external_id)
  end
end