#!/usr/bin/env ruby
require 'rubygems'
require 'bundler'
require 'rack/contrib'
require 'rack-server-pages'

ENV['RACK_ENV'] ||= 'development'

Bundler.require(:default, ENV['RACK_ENV'].to_sym)

if Gem::Specification.find_all_by_name('dotenv').any?
  require 'dotenv'
  Dotenv.load
end

$stdout.sync = true
  
use Rack::ServerPages do |config|
  config.view_path = File.expand_path('../public', __FILE__)
end

# You can optionally enable authentication on the sidekiq dashboard - uncomment the lines below and set the config vars
#Sidekiq::Web.use Rack::Auth::Basic do |username, password|
#  username == ENV["SIDEKIQ_USERNAME"] && password == ENV["SIDEKIQ_PASSWORD"]
#end

require 'sidekiq/web'
require 'sidekiq-status'
require 'sidekiq-status/web'
require './app/server/application'
require './app/workers/account_manager_assignment_worker'

Sidekiq.configure_client do |config|
  config.client_middleware do |chain|
    chain.add Sidekiq::Status::ClientMiddleware
  end
end

run Rack::URLMap.new('/' => Application, '/sidekiq' => Sidekiq::Web)