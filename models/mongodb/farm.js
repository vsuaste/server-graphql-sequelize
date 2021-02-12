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
const errorHelper = require('../../utils/errors');
const { off } = require('process');
const { help } = require('mathjs');
const os = require('os');
const helpersAcl = require('../../utils/helpers-acl');
const fileTools = require('../../utils/file-tools');
const email = require('../../utils/email');
const fs = require('fs');

// An exact copy of the the model definition that comes from the .json file
const definition = {
    model: 'farm',
    storageType: 'mongodb',
    attributes: {
        farm_id: 'String',
        farm_name: 'String',
        owner: 'String'
    },
    associations: {
        animal: {
            type: 'to_many',
            target: 'animal',
            targetKey: 'farm_id',
            keyIn: 'animal',
            targetStorageType: 'mongodb',
            label: 'animal_id'
        }
    },
    internalId: 'farm_id',
    id: {
        name: 'farm_id',
        type: 'String'
    }
};

/**
 * module - Creates a MongoDB data model
 */
module.exports = class farm {

    constructor(input){
        for (let key of Object.keys(input)) {
            this[key] = input[key];
        }
    }

    /**
     * Get the storage handler, which is a static property of the data model class.
     * @returns connected mongodb
     */
    get storageHandler() {
        return farm.storageHandler;
    }

    /**
     * name - Getter for the name attribute
     *
     * This attribute is needed by the models' index
     * @return {string} The name of the model
     */
    static get name(){
        return "farm";
    }

    static async readById(id) {
        const db = await this.storageHandler
        const collection = await db.collection('farm')
        const id_name = this.idAttribute();
        let item = await collection.findOne({[id_name] : id});
        if (item === null) {
            throw new Error(`Record with ID = "${id}" does not exist`);
        }
        validatorUtil.validateData('validateAfterRead', this, item);
        item = new farm(item);
        return item
    }

    static async countRecords(search) {
        let filter = mongoDbHelper.searchConditionsToMongoDb(search);
        const db = await this.storageHandler
        const collection = await db.collection('farm')
        let number = await collection.countDocuments(filter)
        return number
    }

    static async readAll(search, order, pagination, benignErrorReporter) {
        //use default BenignErrorReporter if no BenignErrorReporter defined
        benignErrorReporter = errorHelper.getDefaultBenignErrorReporterIfUndef(benignErrorReporter);
        // build the filter object for limit-offset-based pagination
        let filter = mongoDbHelper.searchConditionsToMongoDb(search);
        let sort = mongoDbHelper.orderConditionsToMongoDb(order, this.idAttribute(), true);
        
        let limit;
        let offset;
        if (pagination){
            limit = pagination.limit ? pagination.limit : undefined;
            offset = pagination.offset ? pagination.offset : 0;
        }

        const db = await this.storageHandler
        const collection = await db.collection('farm')
        let documents = await collection.find(filter).skip(offset).limit(limit).sort(sort).toArray()
        documents = documents.map( doc => new farm(doc) )
        // validationCheck after read
        return validatorUtil.bulkValidateData('validateAfterRead', this, documents, benignErrorReporter);
    }

    static async readAllCursor(search, order, pagination, benignErrorReporter) {
        //use default BenignErrorReporter if no BenignErrorReporter defined
        benignErrorReporter = errorHelper.getDefaultBenignErrorReporterIfUndef(benignErrorReporter);
        let isForwardPagination = helper.isForwardPagination(pagination);
        // build the filter object.
        let filter = mongoDbHelper.searchConditionsToMongoDb(search);
        let newOrder = isForwardPagination ? order : helper.reverseOrderConditions(order)
        // depending on the direction build the order object
        let sort = mongoDbHelper.orderConditionsToMongoDb(newOrder, this.idAttribute(), isForwardPagination)
        let orderFields = newOrder? newOrder.map( x => x.field ) : []
        // extend the filter for the given order and cursor
        filter = mongoDbHelper.cursorPaginationArgumentsToMongoDb(pagination, sort, filter, orderFields, this.idAttribute())

        // add +1 to the LIMIT to get information about following pages.
        let limit = helper.isNotUndefinedAndNotNull(pagination.first) ? pagination.first + 1 : helper.isNotUndefinedAndNotNull(pagination.last) ? pagination.last + 1 : undefined;
        
        const db = await this.storageHandler
        const collection = await db.collection('farm')
        let documents = await collection.find(filter).limit(limit).sort(sort).toArray()

        // validationCheck after read
        documents = await validatorUtil.bulkValidateData('validateAfterRead', this, documents, benignErrorReporter);
        // get the first record (if exists) in the opposite direction to determine pageInfo.
        // if no cursor was given there is no need for an extra query as the results will start at the first (or last) page.
        let oppDocuments = [];
        if (pagination && (pagination.after || pagination.before)) {
            // reverse the pagination Arguement. after -> before; set first/last to 0, so LIMIT 1 is executed in the reverse Search
            let oppPagination = helper.reversePaginationArgument({...pagination, includeCursor: false});
            let oppForwardPagination = helper.isForwardPagination(oppPagination);
            // build the filter object.
            let oppFilter = mongoDbHelper.searchConditionsToMongoDb(search);

            let oppOrder = oppForwardPagination ? order : helper.reverseOrderConditions(order)
            // depending on the direction build the order object
            let oppSort = mongoDbHelper.orderConditionsToMongoDb(oppOrder, this.idAttribute(), oppForwardPagination)
            let oppOrderFields = oppOrder? oppOrder.map( x => x.field ) : []
            // extend the filter for the given order and cursor
            oppFilter = mongoDbHelper.cursorPaginationArgumentsToMongoDb(oppPagination, oppSort, oppFilter, oppOrderFields, this.idAttribute());
            // add +1 to the LIMIT to get information about following pages.
            let oppLimit = helper.isNotUndefinedAndNotNull(oppPagination.first) ? oppPagination.first + 1 : helper.isNotUndefinedAndNotNull(oppPagination.last) ? oppPagination.last + 1 : undefined;
            oppDocuments = await collection.find(oppFilter).limit(oppLimit).toArray()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
        }

        // build the graphql Connection Object
        let edges = documents.map( doc => {
            let edge = {}
            let farmDoc= new farm(doc)
            edge.node = farmDoc
            edge.cursor = farmDoc.base64Enconde()
            return edge
        })
        let pageInfo = helper.buildPageInfo(edges, oppDocuments, pagination);
        return {
            edges,
            pageInfo
        };
    }

    static async addOne(input) {
        // validate input
        await validatorUtil.validateData('validateForCreate', this, input);
        try {
            const db = await this.storageHandler
            const collection = await db.collection('farm')
            // remove skipAssociationsExistenceChecks
            delete input.skipAssociationsExistenceChecks
            const result =  await collection.insertOne(input);
            const id_name = this.idAttribute();
            const document = await this.readById(result.ops[0][id_name]);
            return document
        } catch (error) {
            throw error;
        }
    }

    static async deleteOne(id) {
        //validate id
        await validatorUtil.validateData('validateForDelete', this, id);
        try {
            const db = await this.storageHandler
            const collection = await db.collection('farm')
            const id_name = this.idAttribute();
            const response = await collection.deleteOne({[id_name]: id});
            if (response.result.ok !== 1){
                throw new Error(`Record with ID = ${id} has not been deleted!`);
            }
            return 'Item successfully deleted';
        } catch (error) {
            console.log(`Record with ID = ${id} does not exist or could not been deleted`)
            throw error;
        }
    }

    static async updateOne(input) {
        //validate input
        await validatorUtil.validateData('validateForUpdate', this, input);
        try {
            const db = await this.storageHandler
            const collection = await db.collection('farm')
            // remove skipAssociationsExistenceChecks
            delete input.skipAssociationsExistenceChecks
            const updatedContent = {}
            for (let key of Object.keys(input)) {
                if (key !== "id"){
                    updatedContent[key] = input[key];
                }
            }
            const id_name = this.idAttribute();
            const response = await collection.updateOne({[id_name]:input[id_name]}, {$set: updatedContent});

            if (response.result.ok !== 1){
                throw new Error(`Record with ID = ${input[id_name]} has not been updated`);
            }
            const document = await this.readById(input[id_name]);
            return document
        } catch (error) {
            throw error;
        }
    }

    static bulkAddCsv(context) {

        let delim = context.request.body.delim;
        let arrayDelim = ";"
        let cols = context.request.body.cols;
        let tmpFile = path.join(os.tmpdir(), uuidv4() + '.csv');

        context.request.files.csv_file.mv(tmpFile).then(() => {

            fileTools.parseCsvStream(tmpFile, this, delim, cols, "mongodb", arrayDelim).then((addedZipFilePath) => {
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

    /**
     * idAttribute - Check whether an attribute "internalId" is given in the JSON model. If not the standard "id" is used instead.
     *
     * @return {type} Name of the attribute that functions as an internalId
     */
    static idAttribute() {
        return farm.definition.id.name;
    }

    /**
     * idAttributeType - Return the Type of the internalId.
     *
     * @return {type} Type given in the JSON model
     */
    static idAttributeType() {
        return farm.definition.id.type;
    }

    /**
     * getIdValue - Get the value of the idAttribute ("id", or "internalId") for an instance of user.
     *
     * @return {type} id value
     */
    getIdValue() {
        return this[farm.idAttribute()]
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
        let attributes = Object.keys(farm.definition.attributes);
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