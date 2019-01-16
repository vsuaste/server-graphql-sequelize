#!/usr/bin/env node

const path = require('path')

try {
  const Sequelize = require(path.join(__dirname, '..', 'connection.js'))
  return 1
} catch (exception) {
  console.log('Could not connect to relational database server.')
  return 0
}
