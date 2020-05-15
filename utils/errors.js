const { GraphQLError } = require('graphql');
const util = require('util');

class customArrayError extends GraphQLError {
  constructor(errors_array, message){
    super(message, null, null, null, null, {errors: errors_array});
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
    if (error.message) {
      throw new GraphQLError(error.message, null, null, null, null, error);
    }else {
      throw new Error(error)
    }
  }
}
module.exports = { handleError}
