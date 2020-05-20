const { GraphQLError } = require('graphql');

class customError extends GraphQLError {
  constructor(originalError, message){
    super(message, null, null, null, null, originalError, {original: originalError.errors});
  }
}

errorString = function(errorArray) {
  return errorArray.reduce((acc, curr) => acc + ', ' + curr.message, '');
}

stringifyCompletely = function(error, replacer, space) {
  let allKeys = Reflect.ownKeys(error);
  let errorMap = {};
  for (let key of allKeys) {
    errorMap[`${key}`] = error[`${key}`];
  }
  return JSON.stringify(errorMap, replacer, space);
}

transformDetailsAndReturnError = function(error, origMessage) {
  let errorCopy = JSON.parse(stringifyCompletely(error));
  return new customError(errorCopy, origMessage);
}

transformDetailsAndThrowError = function(error, origMessage) {
  throw transformDetailsAndReturnError(error, origMessage);
}

handleError = function(error){
  if(error.message){
    transformDetailsAndThrowError(error, error.message);
  }else if(error.name === "SequelizeValidationError"){
    transformDetailsAndThrowError(error, "Validation error.");
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    throw new GraphQLError(`Time out exceeded trying to reach server ${error.url}`);
  }else{
    transformDetailsAndThrowError(error, "");
  }
}

constructErrorForLogging = function(error) {
  if(error.message){
    return transformDetailsAndReturnError(error, error.message);
  }else if(error.name === "SequelizeValidationError"){
    return transformDetailsAndReturnError(error, "Validation error.");
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    return new GraphQLError(`Time out exceeded trying to reach server ${error.url}`);
  }else{
    return transformDetailsAndReturnError(error, "");
  }
}
module.exports = { handleError, constructErrorForLogging }
