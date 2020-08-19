const env = process.env.NODE_ENV || 'development';
const path = require('path')
const config = require(path.join(__dirname, 'config', 'config.json'))[env];
const Sequelize = require('sequelize');

sequelize = new Sequelize(config);
module.exports = sequelize;
