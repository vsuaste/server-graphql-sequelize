#!/usr/bin/env node

const path = require('path')

try {
  let Sequelize = require(path.join(__dirname, '..', 'connection.js'))
  return process.exit(0)
} catch (exception) {
  console.log('Could not connect to relational database server.')
  return process.exit(1)
}
