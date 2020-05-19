const { GraphQLError } = require('graphql');

class customError extends GraphQLError {
  constructor(originalError, message, details){
    super(message, null, null, null, null, originalError, {details: details, original: originalError.errors});
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
  let additionals = '';
  if (error.errors) {
    additionals = errorString(error.errors);
  }
  let message = origMessage + additionals;
  let completeMessage = message;
  let details = '';
  if (completeMessage.indexOf('.') > -1) {
    let [first, ...others] = completeMessage.split(/[:]/); // Keep the regular expression to make this easily changeable
    message = first;
    details = others.join('.');
  }
  return new customError(error, message, details);
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
