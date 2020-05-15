const { GraphQLError } = require('graphql');
const util = require('util');

class customArrayError extends GraphQLError {
  constructor(errors_array, message){
    super(message, null, null, null, null, null, {errors: errors_array});
  }
}

handleError = function(error){
  if(error.message === 'validation failed'){
    throw new customArrayError(error.errors, error.message);
  }else if(error.name === "SequelizeValidationError"){
      throw new customArrayError(error.errors, "Validation error");
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    throw new GraphQLError(`Time out exceeded trying to reach server ${error.url}`);
  }else{
    if (typeof error === 'object') {
      console.log('§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§');
      console.log('§§§ Check for Array: ' + Array.isArray(error));
      console.log('§§§ Found error: ' + JSON.stringify(error, null, 4));
      console.log('§§§ With util.inspect: ' + util.inspect(error));
      console.log(error);
      console.log('§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§');
    } else if (typeof error === 'string') {
      console.log('§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§');
      console.log('Found error string: ' + error);
    } else {
      console.log('§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§');
      console.log('The type of this error is: ' + typeof error);
    }
      throw new Error(error)
  }
}
module.exports = { handleError}
