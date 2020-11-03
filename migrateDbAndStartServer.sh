#!/usr/bin/env bash

# Wait until the relational database-server up and running
waited=0
until node ./scripts/testDatabaseConnectionsAvailable.js 1>/dev/null
do
  if [ $waited == 240 ]; then
    echo -e '\nERROR: Time out reached while waiting for relational database server to be available.\n'
    exit 1
  fi
  sleep 2
  waited=$(expr $waited + 2)
done


# Wait until the cassandra database-server up and running
waitedCassandra=0
until node ./scripts/testCassandraServerAvailable.js
do
	if [ $waitedCassandra == 240 ]; then
		echo -e '\nERROR: Time out reached while waiting for cassandra database server to be available.\n'
		exit 1
	fi
	sleep 2
	waitedCassandra=$(expr $waitedCassandra + 2)
done


# Read config and migrate/seed databases
CONFIG="./config/data_models_storage_config.json"
SEQUELIZE="./node_modules/.bin/sequelize"
DB_KEYS=( $(node ./scripts/getStorageTypes.js) )

for object in ${DB_KEYS[@]}; do

  # Split "key:storageType" in each DB_KEYS element
  params=(${object//:/ })

  # Retrieve individual values
  key="${params[0]}"
  storageType="${params[1]}"

  # Execute sequelize CLI
  sequelize_params=(
    "--config $CONFIG"
    "--env $key"
    "--migrations-path ./migrations/$key/"
    "--seeders-path ./seeders/$key/"
  )

  if [[ "$storageType" == "sql" ]]; then

    # Run the migrations
    if ! $SEQUELIZE db:migrate ${sequelize_params[@]}; then
      echo -e '\nERROR: Migrating the relational database(s) caused an error.\n'
      exit 1
    fi

    # Run seeders if needed
    if [ -d ./seeders/$key ]; then
      if ! $SEQUELIZE db:seed:all ${sequelize_params[@]}; then
        echo -e '\nERROR: Seeding the relational database(s) caused an error.\n'
        exit 1
      fi
    fi

  fi

done


# Migrate the Cassandra database
node ./scripts/setup_cassandra_db.js

echo -e 'Cassandra is migrated.\n'

# Start GraphQL-server
npm start # acl
