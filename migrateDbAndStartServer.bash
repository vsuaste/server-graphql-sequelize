#!/bin/bash

# Wait until the relational database-server up and running
waited=0
until node ./utils/testSequelizeDbServerAvailable.js > /dev/null 2>&1
do
  if [ $waited == 240 ]; then
    echo -e '\nERROR: Time out reached while waiting for relational database server to be available.\n'
    exit 0
  fi
  sleep 2
  waited=$(expr $waited + 2)
done

# Run the migrations and start GraphQL-server
./node_modules/.bin/sequelize db:migrate && \
  npm start
