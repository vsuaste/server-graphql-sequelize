/*
    Resolvers for basic CRUD operations
*/
const path = require('path');
const animal = require(path.join(__dirname, '..', 'models', 'index.js')).animal;
const helper = require('../utils/helper');
const checkAuthorization = require('../utils/check-authorization');
const fs = require('fs');
const os = require('os');
const resolvers = require(path.join(__dirname, 'index.js'));
const models = require(path.join(__dirname, '..', 'models', 'index.js'));
const globals = require('../config/globals');
const errorHelper = require('../utils/errors');
const { mode } = require('mathjs');
const associationArgsDef = {
    'addFarm': 'farm'
}


/**
 * animal.prototype.farm - Return associated record
 *
 * @param  {object} search       Search argument to match the associated record
 * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
 * @return {type}         Associated record
 */
animal.prototype.farm = async function({
    search
}, context) {

    if (helper.isNotUndefinedAndNotNull(this.farm_id)) {
        if (search === undefined || search === null) {
            return resolvers.readOneFarm({
                [models.farm.idAttribute()]: this.farm_id
            }, context)
        } else {
            //build new search filter
            let nsearch = helper.addSearchField({
                "search": search,
                "field": models.farm.idAttribute(),
                "value": this.farm_id,
                "operator": "eq"
            });
            let found = await resolvers.farms({
                search: nsearch,
                pagination: {
                    limit: 1
                }
            }, context);
            if (found) {
                return found[0]
            }
            return found;
        }
    }
}

/**
 * handleAssociations - handles the given associations in the create and update case.
 *
 * @param {object} input   Info of each field to create the new record
 * @param {BenignErrorReporter} benignErrorReporter Error Reporter used for reporting Errors from remote zendro services
 */

animal.prototype.handleAssociations = async function(input, benignErrorReporter) {

    let promises_add = [];
    if (helper.isNotUndefinedAndNotNull(input.addFarm)) {
        promises_add.push(this.add_farm(input, benignErrorReporter));
    }

    await Promise.all(promises_add);
    let promises_remove = [];
    if (helper.isNotUndefinedAndNotNull(input.removeFarm)) {
        promises_remove.push(this.remove_farm(input, benignErrorReporter));
    }
    await Promise.all(promises_remove);

}
        
/**
 * add_farm - field Mutation for to_one associations to add
 *
 * @param {object} input   Info of input Ids to add  the association
 * @param {BenignErrorReporter} benignErrorReporter Error Reporter used for reporting Errors from remote zendro services
 */
animal.prototype.add_farm = async function(input, benignErrorReporter) {
    await animal.add_farm_id(this.getIdValue(), input.addFarm, benignErrorReporter);
    this.farm_id = input.addFarm;
}

/**
 * remove_farm - field Mutation for to_one associations to remove
 *
 * @param {object} input   Info of input Ids to remove  the association
 * @param {BenignErrorReporter} benignErrorReporter Error Reporter used for reporting Errors from remote zendro services
 */
animal.prototype.remove_farm = async function(input, benignErrorReporter) {
    if (input.removeFarm === this.farmId) {
        await animal.remove_farmId(this.getIdValue(), input.removeFarm, benignErrorReporter);
        this.farmId = null;
    }
}
/**
 * countAllAssociatedRecords - Count records associated with another given record
 *
 * @param  {ID} id      Id of the record which the associations will be counted
 * @param  {objec} context Default context by resolver
 * @return {Int}         Number of associated records
 */
async function countAllAssociatedRecords(id, context) {

    let animal = await resolvers.readOneAnimal({
        animal_id: id
    }, context);
    //check that record actually exists
    if (animal === null) throw new Error(`Record with ID = ${id} does not exist`);
    let promises_to_many = [];
    let promises_to_one = [];

    promises_to_one.push(animal.farm({}, context));

    let result_to_many = await Promise.all(promises_to_many);
    let result_to_one = await Promise.all(promises_to_one);

    let get_to_many_associated = result_to_many.reduce((accumulator, current_val) => accumulator + current_val, 0);
    let get_to_one_associated = result_to_one.filter((r, index) => helper.isNotUndefinedAndNotNull(r)).length;

    return get_to_one_associated + get_to_many_associated;
}

/**
 * validForDeletion - Checks wether a record is allowed to be deleted
 *
 * @param  {ID} id      _id of record to check if it can be deleted
 * @param  {object} context Default context by resolver
 * @return {boolean}         True if it is allowed to be deleted and false otherwise
 */
async function validForDeletion(id, context) {
    if (await countAllAssociatedRecords(id, context) > 0) {
        throw new Error(`animal with id ${id} has associated records and is NOT valid for deletion. Please clean up before you delete.`);
    }
    return true;
}

module.exports = {
    /**
     * animals - Check user authorization and return certain number, specified in pagination argument, of records that
     * holds the condition of search argument, all of them sorted as specified by the order argument.
     *
     * @param  {object} search     Search argument for filtering records
     * @param  {array} order       Type of sorting (ASC, DESC) for each field
     * @param  {object} pagination Offset and limit to get the records from and to respectively
     * @param  {object} context     Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {array}             Array of records holding conditions specified by search, order and pagination argument
     */
    animals: async function({
        search,
        order,
        pagination
    }, context) {
        if (await checkAuthorization(context, 'animal', 'read') === true) {
            helper.checkCountAndReduceRecordsLimit(pagination.limit, context, "animals");
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await animal.readAll(search, order, pagination, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * animalsConnection - Check user authorization and return certain number, specified in pagination argument, of records that
     * holds the condition of search argument, all of them sorted as specified by the order argument.
     *
     * @param  {object} search     Search argument for filtering records
     * @param  {array} order       Type of sorting (ASC, DESC) for each field
     * @param  {object} pagination Cursor and first(indicatig the number of records to retrieve) arguments to apply cursor-based pagination.
     * @param  {object} context     Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {array}             Array of records as grapqhql connections holding conditions specified by search, order and pagination argument
     */
    animalsConnection: async function({
        search,
        order,
        pagination
    }, context) {
        if (await checkAuthorization(context, 'animal', 'read') === true) {
            helper.checkCursorBasedPaginationArgument(pagination);
            let limit = helper.isNotUndefinedAndNotNull(pagination.first) ? pagination.first : pagination.last;
            helper.checkCountAndReduceRecordsLimit(limit, context, "animalsConnection");
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await animal.readAllCursor(search, order, pagination, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * readOneAnimal - Check user authorization and return one record with the specified id in the id argument.
     *
     * @param  {number} {animal_id}    id of the record to retrieve
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {object}         Record with id requested
     */
    readOneAnimal: async function({
        animal_id
    }, context) {
        if (await checkAuthorization(context, 'animal', 'read') === true) {
            helper.checkCountAndReduceRecordsLimit(1, context, "readOneAnimal");
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await animal.readById(animal_id, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * countAnimals - Counts number of records that holds the conditions specified in the search argument
     *
     * @param  {object} {search} Search argument for filtering records
     * @param  {object} context  Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {number}          Number of records that holds the conditions specified in the search argument
     */
    countAnimals: async function({
        search
    }, context) {
        if (await checkAuthorization(context, 'animal', 'read') === true) {
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await animal.countRecords(search, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * addAnimal - Check user authorization and creates a new record with data specified in the input argument.
     * This function only handles attributes, not associations.
     * @see handleAssociations for further information.
     *
     * @param  {object} input   Info of each field to create the new record
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {object}         New record created
     */
    addAnimal: async function(input, context) {
        let authorization = await checkAuthorization(context, 'animal', 'create');
        if (authorization === true) {
            let inputSanitized = helper.sanitizeAssociationArguments(input, [Object.keys(associationArgsDef)]);
            await helper.checkAuthorizationOnAssocArgs(inputSanitized, context, associationArgsDef, ['read', 'create'], models);
            await helper.checkAndAdjustRecordLimitForCreateUpdate(inputSanitized, context, associationArgsDef);
            if (!input.skipAssociationsExistenceChecks) {
                await helper.validateAssociationArgsExistence(inputSanitized, context, associationArgsDef);
            }
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            let createdAnimal = await animal.addOne(inputSanitized, benignErrorReporter);
            await createdAnimal.handleAssociations(inputSanitized, benignErrorReporter);
            return createdAnimal;
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * bulkAddAnimalCsv - Load csv file of documents
     *
     * @param  {string} _       First parameter is not used
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     */
    bulkAddAnimalCsv: async function(_, context) {
        if (await checkAuthorization(context, 'animal', 'create') === true) {
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return animal.bulkAddCsv(context, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * deleteAnimal - Check user authorization and delete a record with the specified _id in the _id argument.
     *
     * @param  {number} {animal_id}    id of the record to delete
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {string}         Message indicating if deletion was successfull.
     */
    deleteAnimal: async function({
        animal_id
    }, context) {
        if (await checkAuthorization(context, 'animal', 'delete') === true) {
            if (await validForDeletion(animal_id, context)) {
                let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
                return animal.deleteOne(animal_id, benignErrorReporter);
            }
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * updateRole - Check user authorization and update the record specified in the input argument
     * This function only handles attributes, not associations.
     * @see handleAssociations for further information.
     *
     * @param  {object} input   record to update and new info to update
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {object}         Updated record
     */
    updateAnimal: async function(input, context) {
        let authorization = await checkAuthorization(context, 'animal', 'update');
        if (authorization === true) {
            let inputSanitized = helper.sanitizeAssociationArguments(input, [Object.keys(associationArgsDef)]);
            await helper.checkAuthorizationOnAssocArgs(inputSanitized, context, associationArgsDef, ['read', 'create'], models);
            await helper.checkAndAdjustRecordLimitForCreateUpdate(inputSanitized, context, associationArgsDef);
            if (!input.skipAssociationsExistenceChecks) {
                await helper.validateAssociationArgsExistence(inputSanitized, context, associationArgsDef);
            }
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            let updatedAnimal = await animal.updateOne(inputSanitized, benignErrorReporter);
            await updatedAnimal.handleAssociations(inputSanitized, benignErrorReporter);
            return updatedAnimal;
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * bulkAssociateWithFarmId - bulkAssociaton resolver of given ids
     *
     * @param  {array} bulkAssociationInput Array of associations to add , 
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {string} returns message on success
     */
    bulkAssociateAnimalWithFarmId: async function(bulkAssociationInput, context) {
        let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
        // if specified, check existence of the unique given ids
        if (!bulkAssociationInput.skipAssociationsExistenceChecks) {
            await helper.validateExistence(helper.unique(bulkAssociationInput.bulkAssociationInput.map(({
                farm_id
            }) => farm_id)), models.farm);
            await helper.validateExistence(helper.unique(bulkAssociationInput.bulkAssociationInput.map(({
                animal_id
            }) => animal_id)), animal);
        }
        return await animal.bulkAssociateAnimalWithFarmId(bulkAssociationInput.bulkAssociationInput, benignErrorReporter);
    },
    /**
     * bulkDisAssociateAnimalWithFarmId - bulkDisAssociaton resolver of given ids
     *
     * @param  {array} bulkAssociationInput Array of associations to remove , 
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {string} returns message on success
     */
    bulkDisAssociateAnimalWithFarmId: async function(bulkAssociationInput, context) {
        let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
        // if specified, check existence of the unique given ids
        if (!bulkAssociationInput.skipAssociationsExistenceChecks) {
            await helper.validateExistence(helper.unique(bulkAssociationInput.bulkAssociationInput.map(({
                farm_id
            }) => farm_id)), models.farm);
            await helper.validateExistence(helper.unique(bulkAssociationInput.bulkAssociationInput.map(({
                animal_id
            }) => animal_id)), animal);
        }
        return await animal.bulkDisAssociateAnimalWithFarmId(bulkAssociationInput.bulkAssociationInput, benignErrorReporter);
    },

    /**
     * csvTableTemplateAnimal - Returns table's template
     *
     * @param  {string} _       First parameter is not used
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {Array}         Strings, one for header and one columns types
     */
    csvTableTemplateAnimal: async function(_, context) {
        if (await checkAuthorization(context, 'animal', 'read') === true) {
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return animal.csvTableTemplate(benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    }

}
