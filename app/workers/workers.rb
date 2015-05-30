#!/usr/bin/env ruby
require 'rubygems'
require 'bundler'
require 'rack/contrib'

ENV['RACK_ENV'] ||= 'development'

Bundler.require(:default, ENV['RACK_ENV'].to_sym)

if Gem::Specification.find_all_by_name('dotenv').any?
  require 'dotenv'
  Dotenv.load
end

$stdout.sync = true

require 'sidekiq'
require 'sidekiq-status'
require './app/workers/account_manager_assignment_worker'

Sidekiq.configure_server do |config|
  config.server_middleware do |chain|
    chain.add Sidekiq::Status::ServerMiddleware, expiration: 1800
  end
  config.client_middleware do |chain|
    chain.add Sidekiq::Status::ClientMiddleware
  end
end