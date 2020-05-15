const { GraphQLError } = require('graphql');

class customError extends GraphQLError {
  constructor(originalError, message){
    super(message, null, null, null, null, originalError);
  }
}

handleError = function(error){
  if(error.message){
    throw new customError(error, error.message);
  }else if(error.name === "SequelizeValidationError"){
      throw new customError(error, "Validation error");
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    throw new GraphQLError(`Time out exceeded trying to reach server ${error.url}`);
  }else{
    throw new Error(error)
  }
}
module.exports = { handleError}
