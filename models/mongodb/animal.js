'use strict';

const _ = require('lodash');
const searchArg = require('../../utils/search-argument');
const globals = require('../../config/globals');
const validatorUtil = require('../../utils/validatorUtil');
const path = require('path');
const uuidv4 = require('uuidv4').uuid;
const helper = require('../../utils/helper');
const mongoDbHelper = require('../../utils/mongodb_helper')
const models = require(path.join(__dirname, '..', 'index.js'));
const {ObjectId} = require('mongodb')
const errorHelper = require('../../utils/errors');
const { off } = require('process');
const { help } = require('mathjs');

// An exact copy of the the model definition that comes from the .json file
const definition = {
    model: 'animal',
    storageType: 'mongodb',
    attributes: {
        _id: 'ObjectId',
        category: 'String',
        name: 'String',
        age: 'Int',
        weight: 'Float',
        health: 'Boolean',
        birthday: 'DateTime',
        personality: '[String]'
    }
};

/**
 * module - Creates a MongoDB data model
 */
module.exports = class animal {

    constructor(input){
        for (let key of Object.keys(input)) {
            this[key] = input[key];
        }
    }

    /**
     * Get the storage handler, which is a static property of the data model class.
     * @returns sequelize.
     */
    get storageHandler() {
        return animal.storageHandler;
    }

    /**
     * name - Getter for the name attribute
     *
     * This attribute is needed by the models' index
     * @return {string} The name of the model
     */
    static get name(){
        return "animal";
    }

    static async readById(_id) {
        const db = await this.storageHandler
        const collection = await db.collection('animal')
        let item = await collection.findOne({"_id": new ObjectId(_id)});
        if (item === null) {
            throw new Error(`Record with ID = "${_id}" does not exist`);
        }
        validatorUtil.validateData('validateAfterRead', this, item);
        item = new animal(item);
        return item
    }

    static async countRecords(search) {
        let filter = mongoDbHelper.searchConditionsToMongoDb(search);
        const db = await this.storageHandler
        const collection = await db.collection('animal')
        let number = await collection.countDocuments(filter)
        console.log('count Records')
        console.log(number)
        return number
    }

    static async readAll(search, order, pagination, benignErrorReporter) {
        //use default BenignErrorReporter if no BenignErrorReporter defined
        benignErrorReporter = errorHelper.getDefaultBenignErrorReporterIfUndef(benignErrorReporter);
        // build the filter object for limit-offset-based pagination
        let filter = mongoDbHelper.searchConditionsToMongoDb(search);
        console.log('filter in readAll')
        console.log(filter)
        let sort = mongoDbHelper.orderConditionsToMongoDb(order, this.idAttribute(), true);
        console.log(sort)
        
        let limit;
        let offset;
        if (pagination){
            limit = pagination.limit ? pagination.limit : undefined;
            offset = pagination.offset ? pagination.offset : 0;
        }
        console.log(pagination.offset)
        console.log(offset+";"+limit)

        const db = await this.storageHandler
        const collection = await db.collection('animal')
        let documents = await collection.find(filter).skip(offset).limit(limit).sort(sort).toArray()
        console.log(documents)
        // validationCheck after read
        return validatorUtil.bulkValidateData('validateAfterRead', this, documents, benignErrorReporter);
    }

    static async readAllCursor(search, order, pagination, benignErrorReporter) {
        //use default BenignErrorReporter if no BenignErrorReporter defined
        benignErrorReporter = errorHelper.getDefaultBenignErrorReporterIfUndef(benignErrorReporter);

        let isForwardPagination = helper.isForwardPagination(pagination);
        // build the filter object.
        let filter = mongoDbHelper.searchConditionsToMongoDb(search);
        // depending on the direction build the order object
        let sort = isForwardPagination ? mongoDbHelper.orderConditionsToMongoDb(order, this.idAttribute(), isForwardPagination)
        : mongoDbHelper.orderConditionsToMongoDb(helper.reverseOrderConditions(order), this.idAttribute(), isForwardPagination);
        // extend the where options for the given order and cursor
        mongoDbHelper.cursorPaginationArgumentsToMongoDb(pagination, sort, filter, this.idAttribute());
        // add +1 to the LIMIT to get information about following pages.
        let limit = helper.isNotUndefinedAndNotNull(pagination.first) ? pagination.first + 1 : helper.isNotUndefinedAndNotNull(pagination.last) ? pagination.last + 1 : undefined;
        
        const db = await this.storageHandler
        const collection = await db.collection('animal')
        let documents = await collection.find(filter).limit(limit).sort(sort).toArray()
        console.log(documents)

        // validationCheck after read
        records = await validatorUtil.bulkValidateData('validateAfterRead', this, records, benignErrorReporter);
        // get the first record (if exists) in the opposite direction to determine pageInfo.
        // if no cursor was given there is no need for an extra query as the results will start at the first (or last) page.
        let oppDocuments = [];
        if (pagination && (pagination.after || pagination.before)) {
            // reverse the pagination Arguement. after -> before; set first/last to 0, so LIMIT 1 is executed in the reverse Search
            let oppPagination = helper.reversePaginationArgument({...pagination, includeCursor: false});
            // build the filter object.
            let oppFilter = mongoDbHelper.searchConditionsToMongoDb(search);
            // extend the where options for the given order and cursor
            mongoDbHelper.cursorPaginationArgumentsToMongoDb(oppPagination, oppFilter, [], this.idAttribute());
            // add +1 to the LIMIT to get information about following pages.
            let oppLimit = helper.isNotUndefinedAndNotNull(oppPagination.first) ? oppPagination.first + 1 : helper.isNotUndefinedAndNotNull(oppPagination.last) ? oppPagination.last + 1 : undefined;
            
            oppDocuments = await collection.find(oppFilter).limit(oppLimit).toArray()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
        }

        // build the graphql Connection Object
        let edges = helper.buildEdgeObject(records);
        let pageInfo = helper.buildPageInfo(edges, oppDocuments, pagination);
        return {
            edges,
            pageInfo
        };
        // // build the filter object for cursor-based pagination
        // let options = helper.buildCursorBasedSequelizeOptions(search, order, pagination, this.idAttribute(), user.definition.attributes);
        // let records = await super.findAll(options);

        // // validationCheck after read
        // records = await validatorUtil.bulkValidateData('validateAfterRead', this, records, benignErrorReporter);
        // // get the first record (if exists) in the opposite direction to determine pageInfo.
        // // if no cursor was given there is no need for an extra query as the results will start at the first (or last) page.
        // let oppRecords = [];
        // if (pagination && (pagination.after || pagination.before)) {
        //     let oppOptions = helper.buildOppositeSearchSequelize(search, order, {
        //         ...pagination,
        //         includeCursor: false
        //     }, this.idAttribute(), user.definition.attributes);
        //     oppRecords = await super.findAll(oppOptions);
        // }
        // // build the graphql Connection Object
        // let edges = helper.buildEdgeObject(records);
        // let pageInfo = helper.buildPageInfo(edges, oppRecords, pagination);
        // return {
        //     edges,
        //     pageInfo
        // };
    }

    static async addOne(input) {
        // validate input
        await validatorUtil.validateData('validateForCreate', this, input);
        try {
            const db = await this.storageHandler
            const collection = await db.collection('animal')
            // remove skipAssociationsExistenceChecks
            delete input.skipAssociationsExistenceChecks
            const result =  await collection.insertOne(input);
            const document = await this.readById(result.ops[0]._id);
            return document
        } catch (error) {
            throw error;
        }
    }

    static async deleteOne(_id) {
        //validate id
        await validatorUtil.validateData('validateForDelete', this, _id);
        try {
            const db = await this.storageHandler
            const collection = await db.collection('animal')
            const response = await collection.deleteOne({"_id": new ObjectId(_id)});
            console.log(response)
            if (response.result.ok !== 1){
                throw new Error(`Record with ID = ${input._id} has not been deleted!`);
            }
            return 'Item successfully deleted';
        } catch (error) {
            console.log(`Record with ID = ${_id} does not exist or could not been deleted`)
            throw error;
        }
    }

    static async updateOne(input) {
        //validate input
        await validatorUtil.validateData('validateForUpdate', this, input);
        try {
            const db = await this.storageHandler
            const collection = await db.collection('animal')
            // remove skipAssociationsExistenceChecks
            delete input.skipAssociationsExistenceChecks
            const updatedContent = {}
            for (let key of Object.keys(input)) {
                if (key !== "_id"){
                    updatedContent[key] = input[key];
                }
            }
            const response = await collection.updateOne({'_id':new ObjectId(input._id)}, {$set: updatedContent});

            if (response.result.ok !== 1){
                throw new Error(`Record with ID = ${input._id} has not been updated`);
            }
            const document = await this.readById(input._id);
            return document
        } catch (error) {
            throw error;
        }
    }

    static bulkAddCsv(context) {

        let delim = context.request.body.delim;
        let cols = context.request.body.cols;
        let tmpFile = path.join(os.tmpdir(), uuidv4() + '.csv');

        context.request.files.csv_file.mv(tmpFile).then(() => {

            fileTools.parseCsvStream(tmpFile, this, delim, cols).then((addedZipFilePath) => {
                try {
                    console.log(`Sending ${addedZipFilePath} to the user.`);

                    let attach = [];
                    attach.push({
                        filename: path.basename("added_data.zip"),
                        path: addedZipFilePath
                    });

                    email.sendEmail(helpersAcl.getTokenFromContext(context).email,
                        'ScienceDB batch add',
                        'Your data has been successfully added to the database.',
                        attach).then(function(info) {
                        fileTools.deleteIfExists(addedZipFilePath);
                        console.log(info);
                    }).catch(function(err) {
                        fileTools.deleteIfExists(addedZipFilePath);
                        console.error(err);
                    });

                } catch (error) {
                    console.error(error.message);
                }

                fs.unlinkSync(tmpFile);
            }).catch((error) => {
                email.sendEmail(helpersAcl.getTokenFromContext(context).email,
                    'ScienceDB batch add', `${error.message}`).then(function(info) {
                    console.error(info);
                }).catch(function(err) {
                    console.error(err);
                });

                fs.unlinkSync(tmpFile);
            });



        }).catch((error) => {
            throw new Error(error);
        });

        return `Bulk import of user records started. You will be send an email to ${helpersAcl.getTokenFromContext(context).email} informing you about success or errors`;
    }

    /**
     * csvTableTemplate - Allows the user to download a template in CSV format with the
     * properties and types of this model.
     *
     * @param {BenignErrorReporter} benignErrorReporter can be used to generate the standard
     * GraphQL output {error: ..., data: ...}. If the function reportError of the benignErrorReporter
     * is invoked, the server will include any so reported errors in the final response, i.e. the
     * GraphQL response will have a non empty errors property.
     */
    static async csvTableTemplate(benignErrorReporter) {
        return helper.csvTableTemplate(definition);
    }


    // async rolesFilterImpl({
    //     search,
    //     order,
    //     pagination
    // }) {
    //     // build the sequelize options object for limit-offset-based pagination
    //     let options = helper.buildLimitOffsetSequelizeOptions(search, order, pagination, models.role.idAttribute(), models.role.definition.attributes);
    //     return this.getRoles(options);
    // }


    // async rolesConnectionImpl({
    //     search,
    //     order,
    //     pagination
    // }) {
    //     // build the sequelize options object for cursor-based pagination
    //     let options = helper.buildCursorBasedSequelizeOptions(search, order, pagination, models.role.idAttribute(), models.role.definition.attributes);
    //     let records = await this.getRoles(options);
    //     // get the first record (if exists) in the opposite direction to determine pageInfo.
    //     // if no cursor was given there is no need for an extra query as the results will start at the first (or last) page.
    //     let oppRecords = [];
    //     if (pagination && (pagination.after || pagination.before)) {
    //         let oppOptions = helper.buildOppositeSearchSequelize(search, order, {
    //             ...pagination,
    //             includeCursor: false
    //         }, models.role.idAttribute(), models.role.definition.attributes);
    //         oppRecords = await this.getRoles(oppOptions);
    //     }
    //     // build the graphql Connection Object
    //     let edges = helper.buildEdgeObject(records);
    //     let pageInfo = helper.buildPageInfo(edges, oppRecords, pagination);
    //     return {
    //         edges,
    //         pageInfo
    //     };
    // }

    // countFilteredRolesImpl({
    //     search
    // }) {
    //     let options = {}
    //     options['where'] = helper.searchConditionsToSequelize(search);
    //     return this.countRoles(options);
    // }


    // /**
    //  * add_roleId - field Mutation (model-layer) for to_one associationsArguments to add
    //  *
    //  * @param {Id}   id   IdAttribute of the root model to be updated
    //  * @param {Id}   roleId Foreign Key (stored in "Me") of the Association to be updated.
    //  */
    // static async add_roleId(record, addRoles) {
    //     const updated = await this.sequelize.transaction(async (transaction) => {
    //         return await record.addRoles(addRoles, {
    //             transaction: transaction
    //         });
    //     });
    //     return updated;
    // }

    // /**
    //  * remove_roleId - field Mutation (model-layer) for to_one associationsArguments to remove
    //  *
    //  * @param {Id}   id   IdAttribute of the root model to be updated
    //  * @param {Id}   roleId Foreign Key (stored in "Me") of the Association to be updated.
    //  */
    // static async remove_roleId(record, removeRoles) {
    //     const updated = await this.sequelize.transaction(async (transaction) => {
    //         return await record.removeRoles(removeRoles, {
    //             transaction: transaction
    //         });
    //     });
    //     return updated;
    // }

    /**
     * idAttribute - Check whether an attribute "internalId" is given in the JSON model. If not the standard "id" is used instead.
     *
     * @return {type} Name of the attribute that functions as an internalId
     */
    static idAttribute() {
        return "_id";
    }

    /**
     * idAttributeType - Return the Type of the internalId.
     *
     * @return {type} Type given in the JSON model
     */
    static idAttributeType() {
        return "ObjectId";
    }

    /**
     * getIdValue - Get the value of the idAttribute ("id", or "internalId") for an instance of user.
     *
     * @return {type} id value
     */
    getIdValue() {
        return this[animal.idAttribute()]
    }

    static get definition() {
        return definition;
    }

    static base64Decode(cursor) {
        return Buffer.from(cursor, 'base64').toString('utf-8');
    }

    base64Enconde() {
        return Buffer.from(JSON.stringify(this.stripAssociations())).toString('base64');
    }

    stripAssociations() {
        let attributes = Object.keys(animal.definition.attributes);
        let data_values = _.pick(this, attributes);
        return data_values;
    }

    static externalIdsArray() {
        let externalIds = [];
        if (definition.externalIds) {
            externalIds = definition.externalIds;
        }

        return externalIds;
    }

    static externalIdsObject() {
        return {};
    }

}