/*
    Resolvers for basic CRUD operations
*/
const path = require('path');
const farm = require(path.join(__dirname, '..', 'models', 'index.js')).farm;
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
    'addAnimals': 'animal'
}


/**
 * farm.prototype.animalsFilter - Check user authorization and return certain number, specified in pagination argument, of records
 * associated with the current instance, this records should also
 * holds the condition of search argument, all of them sorted as specified by the order argument.
 *
 * @param  {object} search     Search argument for filtering associated records
 * @param  {array} order       Type of sorting (ASC, DESC) for each field
 * @param  {object} pagination Offset and limit to get the records from and to respectively
 * @param  {object} context     Provided to every resolver holds contextual information like the resquest query and user info.
 * @return {array}             Array of associated records holding conditions specified by search, order and pagination argument
 */
farm.prototype.animalsFilter = function({
    search,
    order,
    pagination
}, context) {


    //build new search filter
    let nsearch = helper.addSearchField({
        "search": search,
        "field": "farm_id",
        "value": this.getIdValue(),
        "operator": "eq"
    });

    return resolvers.animals({
        search: nsearch,
        order: order,
        pagination: pagination
    }, context);
}

/**
 * farm.prototype.countFilteredAnimals - Count number of associated records that holds the conditions specified in the search argument
 *
 * @param  {object} {search} description
 * @param  {object} context  Provided to every resolver holds contextual information like the resquest query and user info.
 * @return {type}          Number of associated records that holds the conditions specified in the search argument
 */
farm.prototype.countFilteredAnimals = function({
    search
}, context) {

    //build new search filter
    let nsearch = helper.addSearchField({
        "search": search,
        "field": "farm_id",
        "value": this.getIdValue(),
        "operator": "eq"
    });
    return resolvers.countAnimals({
        search: nsearch
    }, context);
}

/**
 * farm.prototype.animalsConnection - Check user authorization and return certain number, specified in pagination argument, of records
 * associated with the current instance, this records should also
 * holds the condition of search argument, all of them sorted as specified by the order argument.
 *
 * @param  {object} search     Search argument for filtering associated records
 * @param  {array} order       Type of sorting (ASC, DESC) for each field
 * @param  {object} pagination Cursor and first(indicatig the number of records to retrieve) arguments to apply cursor-based pagination.
 * @param  {object} context     Provided to every resolver holds contextual information like the resquest query and user info.
 * @return {array}             Array of records as grapqhql connections holding conditions specified by search, order and pagination argument
 */
farm.prototype.animalsConnection = function({
    search,
    order,
    pagination
}, context) {


    //build new search filter
    let nsearch = helper.addSearchField({
        "search": search,
        "field": "farm_id",
        "value": this.getIdValue(),
        "operator": "eq"
    });
    return resolvers.animalsConnection({
        search: nsearch,
        order: order,
        pagination: pagination
    }, context);
}

/**
 * handleAssociations - handles the given associations in the create and update case.
 *
 * @param {object} input   Info of each field to create the new record
 * @param {BenignErrorReporter} benignErrorReporter Error Reporter used for reporting Errors from remote zendro services
 */

farm.prototype.handleAssociations = async function(input, benignErrorReporter) {

    let promises_add = [];
    if (helper.isNonEmptyArray(input.addAnimals)) {
        promises_add.push(this.add_animals(input, benignErrorReporter));
    }

    await Promise.all(promises_add);
    let promises_remove = [];
    if (helper.isNonEmptyArray(input.removeAnimals)) {
        promises_remove.push(this.remove_animals(input, benignErrorReporter));
    }

    await Promise.all(promises_remove);

}
/**
 * add_animals - field Mutation for to_many associations to add
 * uses bulkAssociate to efficiently update associations
 *
 * @param {object} input   Info of input Ids to add  the association
 * @param {BenignErrorReporter} benignErrorReporter Error Reporter used for reporting Errors from remote zendro services
 */
farm.prototype.add_animals = async function(input, benignErrorReporter) {

    let bulkAssociationInput = input.addAnimals.map(associatedRecordId => {
        return {
            farm_id: this.getIdValue(),
            [models.animal.idAttribute()]: associatedRecordId
        }
    });
    await models.animal.bulkAssociateAnimalWithFarmId(bulkAssociationInput, benignErrorReporter);
}

/**
 * remove_animals - field Mutation for to_many associations to remove
 * uses bulkAssociate to efficiently update associations
 *
 * @param {object} input   Info of input Ids to remove  the association
 * @param {BenignErrorReporter} benignErrorReporter Error Reporter used for reporting Errors from remote zendro services
 */
farm.prototype.remove_animals = async function(input, benignErrorReporter) {

    let bulkAssociationInput = input.removeAnimals.map(associatedRecordId => {
        return {
            farm_id: this.getIdValue(),
            [models.animal.idAttribute()]: associatedRecordId
        }
    });
    await models.animal.bulkDisAssociateAnimalWithFarmId(bulkAssociationInput, benignErrorReporter);
}        


/**
 * countAllAssociatedRecords - Count records associated with another given record
 *
 * @param  {ID} id      Id of the record which the associations will be counted
 * @param  {objec} context Default context by resolver
 * @return {Int}         Number of associated records
 */
async function countAllAssociatedRecords(id, context) {
    let farm = await resolvers.readOneFarm({
        farm_id: id
    }, context);
    //check that record actually exists
    if (farm === null) throw new Error(`Record with ID = ${id} does not exist`);
    let promises_to_many = [];
    let promises_to_one = [];

    promises_to_many.push(farm.countFilteredAnimals({}, context));

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
        throw new Error(`farm with id ${id} has associated records and is NOT valid for deletion. Please clean up before you delete.`);
    }
    return true;
}

module.exports = {
    /**
     * farms - Check user authorization and return certain number, specified in pagination argument, of records that
     * holds the condition of search argument, all of them sorted as specified by the order argument.
     *
     * @param  {object} search     Search argument for filtering records
     * @param  {array} order       Type of sorting (ASC, DESC) for each field
     * @param  {object} pagination Offset and limit to get the records from and to respectively
     * @param  {object} context     Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {array}             Array of records holding conditions specified by search, order and pagination argument
     */
    farms: async function({
        search,
        order,
        pagination
    }, context) {
        if (await checkAuthorization(context, 'farm', 'read') === true) {
            helper.checkCountAndReduceRecordsLimit(pagination.limit, context, "farms");
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            const res = await farm.readAll(search, order, pagination, benignErrorReporter);
            return res
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * farmsConnection - Check user authorization and return certain number, specified in pagination argument, of records that
     * holds the condition of search argument, all of them sorted as specified by the order argument.
     *
     * @param  {object} search     Search argument for filtering records
     * @param  {array} order       Type of sorting (ASC, DESC) for each field
     * @param  {object} pagination Cursor and first(indicatig the number of records to retrieve) arguments to apply cursor-based pagination.
     * @param  {object} context     Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {array}             Array of records as grapqhql connections holding conditions specified by search, order and pagination argument
     */
    farmsConnection: async function({
        search,
        order,
        pagination
    }, context) {
        if (await checkAuthorization(context, 'farm', 'read') === true) {
            helper.checkCursorBasedPaginationArgument(pagination);
            let limit = helper.isNotUndefinedAndNotNull(pagination.first) ? pagination.first : pagination.last;
            helper.checkCountAndReduceRecordsLimit(limit, context, "farmsConnection");
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await farm.readAllCursor(search, order, pagination, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * readOneFarm - Check user authorization and return one record with the specified id in the id argument.
     *
     * @param  {number} {farm_id}    id of the record to retrieve
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {object}         Record with id requested
     */
    readOneFarm: async function({
        farm_id
    }, context) {
        if (await checkAuthorization(context, 'farm', 'read') === true) {
            helper.checkCountAndReduceRecordsLimit(1, context, "readOneFarm");
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await farm.readById(farm_id, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * countFarms - Counts number of records that holds the conditions specified in the search argument
     *
     * @param  {object} {search} Search argument for filtering records
     * @param  {object} context  Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {number}          Number of records that holds the conditions specified in the search argument
     */
    countFarms: async function({
        search
    }, context) {
        if (await checkAuthorization(context, 'farm', 'read') === true) {
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return await farm.countRecords(search, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * addFarm - Check user authorization and creates a new record with data specified in the input argument.
     * This function only handles attributes, not associations.
     * @see handleAssociations for further information.
     *
     * @param  {object} input   Info of each field to create the new record
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {object}         New record created
     */
    addFarm: async function(input, context) {
        let authorization = await checkAuthorization(context, 'farm', 'create');
        if (authorization === true) {
            let inputSanitized = helper.sanitizeAssociationArguments(input, [Object.keys(associationArgsDef)]);
            await helper.checkAuthorizationOnAssocArgs(inputSanitized, context, associationArgsDef, ['read', 'create'], models);
            await helper.checkAndAdjustRecordLimitForCreateUpdate(inputSanitized, context, associationArgsDef);
            if (!input.skipAssociationsExistenceChecks) {
                await helper.validateAssociationArgsExistence(inputSanitized, context, associationArgsDef);
            }
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            let createdFarm = await farm.addOne(inputSanitized, benignErrorReporter);
            await createdFarm.handleAssociations(inputSanitized, benignErrorReporter);
            return createdFarm;
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * bulkAddFarmCsv - Load csv file of documents
     *
     * @param  {string} _       First parameter is not used
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     */
    bulkAddFarmCsv: async function(_, context) {
        if (await checkAuthorization(context, 'farm', 'create') === true) {
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return farm.bulkAddCsv(context, benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },

    /**
     * deleteFarm - Check user authorization and delete a record with the specified _id in the _id argument.
     *
     * @param  {number} {farm_id}    id of the record to delete
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {string}         Message indicating if deletion was successfull.
     */
    deleteFarm: async function({
        farm_id
    }, context) {
        if (await checkAuthorization(context, 'farm', 'delete') === true) {
            if (await validForDeletion(farm_id, context)) {
                let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
                return farm.deleteOne(farm_id, benignErrorReporter);
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
    updateFarm: async function(input, context) {
        let authorization = await checkAuthorization(context, 'farm', 'update');
        if (authorization === true) {
            let inputSanitized = helper.sanitizeAssociationArguments(input, [Object.keys(associationArgsDef)]);
            await helper.checkAuthorizationOnAssocArgs(inputSanitized, context, associationArgsDef, ['read', 'create'], models);
            await helper.checkAndAdjustRecordLimitForCreateUpdate(inputSanitized, context, associationArgsDef);
            if (!input.skipAssociationsExistenceChecks) {
                await helper.validateAssociationArgsExistence(inputSanitized, context, associationArgsDef);
            }
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            let updatedFarm = await farm.updateOne(inputSanitized, benignErrorReporter);
            await updatedFarm.handleAssociations(inputSanitized, benignErrorReporter);
            return updatedFarm;
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    },


    /**
     * csvTableTemplateFarm - Returns table's template
     *
     * @param  {string} _       First parameter is not used
     * @param  {object} context Provided to every resolver holds contextual information like the resquest query and user info.
     * @return {Array}         Strings, one for header and one columns types
     */
    csvTableTemplateFarm: async function(_, context) {
        if (await checkAuthorization(context, 'farm', 'read') === true) {
            let benignErrorReporter = new errorHelper.BenignErrorReporter(context);
            return farm.csvTableTemplate(benignErrorReporter);
        } else {
            throw new Error("You don't have authorization to perform this action");
        }
    }

}
