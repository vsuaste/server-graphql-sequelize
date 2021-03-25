const { existsSync } = require("fs");
const { join } = require("path");
const { getModulesSync } = require("../utils/module-helpers");

let models = {
  sqlDatabases: {},
  mongoDbs: {},
  cassandra: {},
};

module.exports = models;

let connection;

// ****************************************************************************
// IMPORT SEQUELIZE MODELS

/**
 * Grabs all the models in your models folder, adds them to the models object
 */
getModulesSync(__dirname + "/sql").forEach((file) => {
  console.log("loaded model: " + file);
  let model = require(join(__dirname, "sql", file));

  models.sqlDatabases[model.name] = model.definition;

  let validator_patch = join("./validations", file);
  if (existsSync(validator_patch)) {
    model = require(`../${validator_patch}`).validator_patch(model);
  }

  let patches_patch = join("./patches", file);
  if (existsSync(patches_patch)) {
    model = require(`../${patches_patch}`).logic_patch(model);
  }

  if (model.name in models) throw Error(`Duplicated model name ${model.name}`);

  models[model.name] = model;
});

/**
 * Update tables with association (temporary, just for testing purposes)
 * This part is supposed to be done in the migration file
 */
// sequelize.sync({force: true});

// ****************************************************************************
// IMPORT GENERIC MODELS

getModulesSync(__dirname + "/generic").forEach((file) => {
  console.log("loaded model: " + file);
  let model = require(`./${join("./generic", file)}`);

  let validator_patch = join("./validations", file);
  if (existsSync(validator_patch)) {
    model = require(`../${validator_patch}`).validator_patch(model);
  }

  let patches_patch = join("./patches", file);
  if (existsSync(patches_patch)) {
    model = require(`../${patches_patch}`).logic_patch(model);
  }

  if (model.name in models) throw Error(`Duplicated model name ${model.name}`);

  models[model.name] = model;
});

// ****************************************************************************
// IMPORT ZENDRO SERVICES

getModulesSync(__dirname + "/zendro-server").forEach((file) => {
  console.log("loaded model: " + file);
  let model = require(`./${join("./zendro-server", file)}`);

  let validator_patch = join("./validations", file);
  if (existsSync(validator_patch)) {
    model = require(`../${validator_patch}`).validator_patch(model);
  }

  let patches_patch = join("./patches", file);
  if (existsSync(patches_patch)) {
    model = require(`../${patches_patch}`).logic_patch(model);
  }

  if (model.name in models) throw Error(`Duplicated model name ${model.name}`);

  models[model.name] = model;
});

// ****************************************************************************
// IMPORT DISTRIBUTED MODELS

getModulesSync(__dirname + "/distributed").forEach((file) => {
  console.log("loaded model: " + file);
  let model = require(`./${join("./distributed", file)}`);

  let validator_patch = join("./validations", file);
  if (existsSync(validator_patch)) {
    model = require(`../${validator_patch}`).validator_patch(model);
  }

  if (model.name in models) throw Error(`Duplicated model name ${model.name}`);

  models[model.name] = model;
});

// ****************************************************************************
// IMPORT MONGODB MODELS

getModulesSync(__dirname + "/mongodb").forEach((file) => {
  console.log("loaded model: " + file);
  let model = require(`./${join("./mongodb", file)}`);
  models.mongoDbs[model.name] = model.definition;
  let validator_patch = join("./validations", file);
  if (existsSync(validator_patch)) {
    model = require(`../${validator_patch}`).validator_patch(model);
  }
  if (model.name in models) throw Error(`Duplicated model name ${model.name}`);

  models[model.name] = model;
});
// ****************************************************************************
// IMPORT CASSANDRA MODELS
getModulesSync(__dirname + "/cassandra").forEach((file) => {
  console.log("loaded model: " + file);
  let model = require(`./${join("./cassandra", file)}`);
  models.cassandra[model.name] = model.definition;
  let validator_patch = join("./validations", file);
  if (existsSync(validator_patch)) {
    model = require(`../${validator_patch}`).validator_patch(model);
  }
  if (model.name in models) throw Error(`Duplicated model name ${model.name}`);

  models[model.name] = model;
});
