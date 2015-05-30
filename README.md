# Data Demo

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Introduction

This is a simple demonstration showing how you can use Heroku and Heroku Connect to manipulate large volumes of data, using standard SQL in your apps, and have Heroku Connect seamlessly synchronise the changes to the Salesforce organisation.

The demo uses Account records and the concept of a related territory Account Manager - we use these objects to demonstrate the modification of this relationship on a large scale through a web app on Heroku. 

Within Salesforce this is using accounts with a lookup to a custom object. There are other ways to model this relationship - this configuration has been used for simplicity.

We can reassign whole countries to new Account Managers on the click of a button. Behind the scenes, we're updating the association in the Heroku Postgres database - and these changes are then asyncronously replicated to Salesforce via Heroku Connect.

If there were workflow or triggers on the data in Salesforce then these would also be run as normal.

This demo isn't a reference architecture for how you would handle Account Manager assignment in the wild. Its not necessarily the only way to do large updates in SFDC. It's not something that customers would buy!

The main purpose is to show that you can manipulate large volumes of data within your apps on Heroku using the tools and languages you are familiar with - SQL queries on the database, and the libraries and/or ORM layers you are familiar with in your code.

## Getting Started

1. First, setup a Salesforce Org following the instructions in the Chatter Group for this demo.
2. Next, hit the deploy to Heroku button - you will need a Heroku account.

   [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

3. Once the button has deployed the app, go into your Heroku dashboard for the app you just created. 
4. Click on Heroku Connect in the list of addons for your app - this will take you to the Heroku Connect dashboard.
5. Follow the steps to initialise Heroku Connect - leave the default settings as they are - authorise Heroku Connect using the login and password for the Salesforce Org you created in step 1.
7. Go to Settings and Import/Export Configuration - import the ```connect_mappings.json``` file in the ```data/``` folder of this repo.
8. The data should now begin to synchronise from your Salesforce Org into the Postgres database on Heroku.
9. Once synchronised, go back to your Heroku Dashboard and click on the 'Open Application' link - it is the icon to the right of the app name at the top of the page.

## Queue Monitoring

The app uses Sidekiq to provide the backend queueing functionality - it mounts the Sidekiq dashboard at ```/sidekiq``` on your app URL.

You can modify the code to use simple HTTP authentication on the Sidekiq dashboard - check ```config.ru``` for details.

## To run locally

To run locally requires some familiarity with getting Ruby apps up and running.

Install Ruby 2.1.6 using your preferred method (rbenv, etc) and bundle the Gems.

This app uses Postgres and Redis - when deployed to Heroku this will use the Heroku add-ons. When testng locally you will either need to use local versions of both these services, or point to the services attached to an app on Heroku - be careful not to mix environments!

The app uses environment variables for REDIS_URL and DATABASE_URL - you can export these to your environment or set the values in a .env file.

To run locally using Foreman (included with the Heroku toolbelt):

```foreman start```

## Technical Notes

This is a simple demo - it is not production level code!

It should not currently be considered an example of best practice coding - additionally this demo will also be refactored over time to make use of better Javascript development patterns - and perhaps updated to use a framework like React.

## Issues

Please submit issues using Github issues https://github.com/heroku/datademo/issues