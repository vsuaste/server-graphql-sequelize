const fs = require('fs');
const path = require('path');
sequelize = require('./connection');

var models = {};


// **********************************************************************************
// IMPORT SEQUEILIZE MODELS

//grabs all the models in your models folder, adds them to the models object
fs.readdirSync("./models")
    .filter(function(file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
    })
    .forEach(function(file) {
        console.log(file);
        let model = sequelize['import'](path.join("./models", file));


        let validator_patch = path.join('./validations', file);
        if(fs.existsSync(validator_patch)){
            model = require(`./${validator_patch}`).validator_patch(model);
        }

        let patches_patch = path.join('./patches', file);
        if(fs.existsSync(patches_patch)){
            model = require(`./${patches_patch}`).logic_patch(model);
        }

        if(models[model.name])
            throw Error(`Duplicated model name ${model.name}`);

        models[model.name] = model;

    });
//Important: creates associations based on associations defined in associate function in the model files
Object.keys(models).forEach(function(modelName) {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});
//update tables with association (temporary, just for testing purposes)
//this part is suppose to be done in the migration file
//sequelize.sync({force: true});


// **********************************************************************************
// IMPORT WEBSERVICES

fs.readdirSync("./models-webservice")
    .filter(function(file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
    })
    .forEach(function(file) {
        let model = require(`./${path.join("./models-webservice", file)}`);

        if(models[model.name])
            throw Error(`Duplicated model name ${model.name}`);

        models[model.name] = model;
    });

module.exports = models;


