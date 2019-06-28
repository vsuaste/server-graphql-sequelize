
/**
 * ifHasValidatorFunctionInvoke - checks if data model has a validator function with
 * the given name, and apply that function
 *
 * @param  {string} validatorFunction Name of the validator function
 * @param  {object} dataModel The empty data model object
 * @param  {object} data JSON data to be inserted into the dataModel
 * @return {Promise} The result of invoking the respective validator, or
 *                   undefined if no validator was found to be registered
 *
 */

module.exports.ifHasValidatorFunctionInvoke = async function( validatorFunction, dataModel, data) {
    if (typeof dataModel.prototype[validatorFunction] === "function") {
        return await dataModel.prototype[validatorFunction](data);
    }
};

