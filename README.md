# Data Demo

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Introduction

This is a simple demonstration showing how you can use Heroku and Heroku Connect to manipulate large volumes of data, using standard SQL in your apps, and let Heroku Connect seamlessly synchronise the changes to the Salesforce organisaion.

The demo uses account records and the concept of a related territory account manager - we use these to demonstrate the modification of this association on a large scale through a web app on Heroku. 

Within salesforce this is using accounts with a lookup to a custom object. There are other ways to model this - this configuration has been used for simplicity.

We can reassign whole countries to new account managers on the click of a button. Behind the scenes, we're updating the association in the Heroku Posgres database - and these changes will then be asyncronously replicated to Salesforce via Heroku Connect.

If there were workflow or triggers on the data in Salesforce then these would also be run as normal.

This demo isn't a reference architecture for how you would handle account manager assignment in the wild. Its not necessarily the only way to do large updates in SFDC. It's not something that customers would buy!

The main purpose is to show that you can manipulate large volumes of data within your apps on Heroku using the tools and languages you are familiar with - SQL queries on the database, and whatever library or ORM you are familiar with in your code.

## Getting Started

1. First, setup a Salesforce Org following the instructions in the Chatter Group for this demo.
2. Next, hit the deploy to Heroku button - you will need a Heroku account.

   [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

3. Once the button has deployed the app, go into your Heroku dashboard for the app you just created. 
4. Click on Heroku Connect in the list of addons for your app - this will take you to the Heroku Connect dashboard.
5. Follow the steps to initialise Heroku Connect - leave the default settings as they are - authorise Heroku Connect using the login and password for the Salesforce Org you created in step 1.
7. Go to Settings and Import/Export Configuration - import the ```connect_mappings.json``` file in the ```doc/``` folder of this repo.
8. The data should now begin to synchronise from your Salesforce Org into the Postgres database on Heroku.
9. Once synchronised, go back to your Heroku Dashboard and click on the 'Open Application' link - it is the icon to the right of the app name at the top of the page.

## To run locally

Install Ruby 2.1.6 using your preferred method and bundle the Gems - then run:

```bundle exec rackup```

## Technical Notes

This is work in progress - it is not production level code!

The update to the database is currently a blocking call in the web thread - this repository is work in progress and over time this will be refactored to use a backend worker and appropriate message queue/notification stream to allow the update to take place asyncronously without blocking the web processes.

Likewise, the Javascript should not currently be considered best practice nor production ready - this will also be refactored over time to make use of better Javascript development patterns - perhaps using React.