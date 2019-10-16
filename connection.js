const env = process.env.NODE_ENV || 'development';
const path = require('path')
const config = require(path.join(__dirname, 'config', 'config.json'))[env];
const Sequelize = require('sequelize');

const Op = Sequelize.Op;
config.operatorsAliases = {
  $eq: Op.eq,
  $and: Op.and,
  $or: Op.or,
  $like: Op.like,
  $between: Op.between,
  $in: Op.in,
  $gt: Op.gt,
  $gte: Op.gte,
  $lt: Op.lt,
  $lte: Op.lte,
  $ne: Op.ne
};

sequelize = new Sequelize(config);

module.exports = sequelize;
