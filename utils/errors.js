const { GraphQLError } = require('graphql');

class customError extends GraphQLError {
  constructor(originalError, message){
    super(message, null, null, null, null, originalError, null);
  }
}

errorString = function(errorArray) {
  return errorArray.reduce((acc, curr) => acc + ', ' + curr.message, '');
}

handleError = function(error){
  if(error.message){
    let additionals = '';
    if (error.errors) {
      additionals = errorString(error.errors);
    }
    throw new customError(error, error.message + additionals);
  }else if(error.name === "SequelizeValidationError"){
      let additionals = '';
      if (error.errors) {
        additionals = errorString(error.errors);
      }
      throw new customError(error, "Validation error" + additionals);
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    throw new GraphQLError(`Time out exceeded trying to reach server ${error.url}`);
  }else{
    let additionals = '';
    if (error.errors) {
      additionals = errorString(error.errors);
    }
    throw new customError(error, additionals);
  }
}
module.exports = { handleError}
