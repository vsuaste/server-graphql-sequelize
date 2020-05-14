const { GraphQLError } = require('graphql');

class customArrayError extends GraphQLError {
  constructor(errors_array, message){
    super(message, null, null, null, null, null, {errors: errors_array.slice()});
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
      throw new GraphQLError(error)
  }
}
module.exports = { handleError}
