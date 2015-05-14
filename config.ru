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

use Rack::TryStatic,
  urls: ['/js', '/css', '/images', '/'],
  index: 'index.html',
  root: File.expand_path('../public', __FILE__)

require './heroku_connect_data_demo_application'
run HerokuConnectDataDemoApplication
