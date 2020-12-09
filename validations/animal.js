// Delete this file, if you do not want or need any validations.
const validatorUtil = require('../utils/validatorUtil')
const Ajv = require('ajv')
const ajv = validatorUtil.addDateTimeAjvKeywords(new Ajv({
    allErrors: true	     
}))


// Dear user, edit the schema to adjust it to your model
module.exports.validator_patch = function(animal) {

    animal.prototype.validationControl = {
        validateForCreate: true,
        validateForUpdate: true,
        validateForDelete: false,
        validateAfterRead: true
    }

    animal.prototype.validatorSchema = {
        "$async": true,
        "properties": {
            "_id": {
                "type": ["string", "null"]
            },
            "name": {
                "type": ["string", "null"]
            },
            "category": {
                "type": ["string", "null"]
            },
            "age": {
                "type": ["integer", "null"]
            },
            "weight": {
                "type": ["number", "null"]
            },
            "health": {
                "type": ["boolean", "null"]
            },
            "birthday": {
                "anyOf": [
                    { "isoDateTime": true },
                    { "type": "null" }
                ]
            },
            "personality": {
                "type": ["array", "null"]
            }
        }
    }
    
    animal.prototype.asyncValidate = ajv.compile(
        animal.prototype.validatorSchema
    )

    animal.prototype.validateForCreate = async function(record) {
        return await animal.prototype.asyncValidate(record)
    }

    animal.prototype.validateForUpdate = async function(record) {
        return await animal.prototype.asyncValidate(record)
    }

    animal.prototype.validateForDelete = async function(id) {

        //TODO: on the input you have the id of the record to be deleted, no generic
        // validation checks are available. You might need to import the correspondant model
        // in order to read the whole record info and the do the validation.

        return {
            error: null
        }
    }

    animal.prototype.validateAfterRead = async function(record) {
        return await animal.prototype.asyncValidate(record)
    }

    return animal
}