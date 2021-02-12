// Delete this file, if you do not want or need any validations.
const validatorUtil = require('../utils/validatorUtil')
const Ajv = require('ajv')
const ajv = validatorUtil.addDateTimeAjvKeywords(new Ajv({
    allErrors: true	     
}))


// Dear user, edit the schema to adjust it to your model
module.exports.validator_patch = function(farm) {

    farm.prototype.validationControl = {
        validateForCreate: true,
        validateForUpdate: true,
        validateForDelete: false,
        validateAfterRead: true
    }

    farm.prototype.validatorSchema = {
        "$async": true,
        "properties": {
            "farm_id": {
                "type": ["string", "null"]
            },
            "farm_name": {
                "type": ["string", "null"]
            },
            "owner": {
                "type": ["string", "null"]
            },
        }
    }
    
    farm.prototype.asyncValidate = ajv.compile(
        farm.prototype.validatorSchema
    )

    farm.prototype.validateForCreate = async function(record) {
        return await farm.prototype.asyncValidate(record)
    }

    farm.prototype.validateForUpdate = async function(record) {
        return await farm.prototype.asyncValidate(record)
    }

    farm.prototype.validateForDelete = async function(id) {

        //TODO: on the input you have the id of the record to be deleted, no generic
        // validation checks are available. You might need to import the correspondant model
        // in order to read the whole record info and the do the validation.

        return {
            error: null
        }
    }

    farm.prototype.validateAfterRead = async function(record) {
        return await farm.prototype.asyncValidate(record)
    }

    return farm
}