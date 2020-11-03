const { Sequelize } = require('sequelize');
const storageConfig = require('./config/data_models_storage_config.json');

const cassandraDriver = require('cassandra-driver');

const Op = Sequelize.Op;
storageConfig.operatorsAliases = {
  $eq: Op.eq,
  $and: Op.and,
  $or: Op.or,
  $like: Op.like,
  $notLike: Op.notLike,
  $between: Op.between,
  $notBetween: Op.notBetween,
  $in: Op.in,
  $notIn: Op.notIn,
  $gt: Op.gt,
  $gte: Op.gte,
  $lt: Op.lt,
  $lte: Op.lte,
  $ne: Op.ne,
  $regexp: Op.regexp,
  $notRegexp: Op.notRegexp
};

/**
 * Stored connection instances. Only sequelize for now.
 */
const connectionInstances = Object.keys(storageConfig).reduce(

  // Reducer function to add only "sql"-type of connections
  (acc, key) => {
    let storageType = storageConfig[key].storageType;
    if (
      storageConfig.hasOwnProperty(key) &&
      key !== 'operatorsAliases' &&
      storageType === 'sql'
    ) {
      acc.set(key, {storageType, connection: new Sequelize(storageConfig[key])})
    } else if (
      storageConfig.hasOwnProperty(key) &&
      storageType === 'cassandra'
    ) {
      acc.set(key, {storageType, connection: this.cassandraClient});
    }
    return acc;
  },

  // Object reference
  new Map()

)

/**
 * Async verification of all connections imported from
 * data_models_storage_config.json.
 */
exports.checkConnections = async () => {

  const checks = [];

  for (const { 0: key, 1: instance } of connectionInstances.entries()) {

    try {
      if (instance.storageType === 'sql') {
        await instance.connection.authenticate();
      } else if (instance.storageType === 'cassandra') {
        await instance.connection.connect();
      }
      checks.push({ key, valid: true });
    }
    catch (exception) {
      checks.push({ key, valid: false });
    }
  }

  return checks;

}

/**
 * Get an existing sequelize instance using the specified database.
 * @param {string} key connection key as defined in the model config
 * @returns A configured connection instance
 */
exports.getConnection = (key) => {

  return connectionInstances.get(key);
}

exports.ConnectionError = class ConnectionError extends Error {

  /**
   * Create a new instance of a data model connection error.
   * @param {object} modelDefinition model definition as a JSON object
   */
  constructor ({ database, model, storageType }) {

    const message = (
      `Model "${model}" connection to its database failed. Verify that ` +
      `database "${database}" and storageType "${storageType}" are ` +
      `correctly set and match the config in "data_models_storage_config.json"`
    )
    super(message)
  }
}


/**
 * setup the cassandraClient
 */
const cassandraConfig = storageConfig["default-cassandra"];
// set up logging of requests
const requestTracker = new cassandraDriver.tracker.RequestLogger({ slowThreshold: 1000, logNormalRequests:true, logErroredRequests:true });
requestTracker.emitter.on('normal', message => console.log(message));
requestTracker.emitter.on('slow', message => console.log(message));
requestTracker.emitter.on('failure', message => console.log(message));
requestTracker.emitter.on('large', message => console.log(message));
// set up new cassandra client as configurated in 'default-cassandra'
exports.cassandraClient = new cassandraDriver.Client({
  contactPoints: [cassandraConfig.host],
  localDataCenter: 'datacenter1',
  keyspace: cassandraConfig.keyspace,
  protocolOptions: {
      port: cassandraConfig.port
  },
  requestTracker: requestTracker
});

/**
 * Add connection as a static property of the data model class.
 * @param {object} modelClass the data model class
 * @param {object} connection the connection
 * @returns The data model class with connection as a static property.
 */
exports.getAndConnectDataModelClass = ( modelClass, connection ) => {
  return Object.defineProperty(modelClass, 'storageHandler', {
      value: connection,
      writable : false, // cannot be changed in the future
      enumerable : true,
      configurable : false
  }); 
}