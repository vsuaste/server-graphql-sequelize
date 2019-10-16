#!/bin/bash

# Wait until the relational database-server up and running
waited=0
until node ./utils/testSequelizeDbServerAvailable.js
do
	if [ $waited == 240 ]; then
		echo -e '\nERROR: Time out reached while waiting for relational database server to be available.\n'
		exit 1
	fi
	sleep 2
	waited=$(expr $waited + 2)
done

# Run the migrations 
if ! ./node_modules/.bin/sequelize db:migrate; then
	echo -e '\nERROR: Migrating the relational database(s) caused an error.\n'
	exit 1
fi

# Run seeders if needed
if [ -d ./seeders ]; then
	if ! ./node_modules/.bin/sequelize db:seed:all; then
		echo -e '\nERROR: Seeding the relational database(s) caused an error.\n'
		exit 1
	fi
fi

# Start GraphQL-server
npm start 2> /usr/src/app/error_server.log # acl
