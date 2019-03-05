
/**
 * ifHasValidatorFunctionInvoke - checks if data model has a validator function with
 * the given name, and apply that function
 *
 * @param  {string} validatorFunction Name of the validator function
 * @param  {object} dataModel The empty data model object
 * @param  {object} data JSON data to be inserted into the dataModel
 * @return {Error}  An error object if data is invalid or null otherwise
 *
 */

module.exports.ifHasValidatorFunctionInvoke = function( validatorFunction, dataModel, data) {
    if (typeof dataModel.prototype[validatorFunction] === "function") {
        if(validatorFunction === 'validatorForDelete'){
            return dataModel.prototype[validatorFunction](dataModel);
        }else{
            return dataModel.prototype[validatorFunction](data).error;
        }
    }
};

