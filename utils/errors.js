
class customArrayError extends Error {
  constructor(errors_array, message){
    super();
    this.message = message;
    this.errors = errors_array;
  }
}

class otherError extends Error {
  constructor(oneError,message){
    super();
    this.message = message;
    this.detail = oneError;
  }
}

handleError = function(error){
  if(error.name === "SequelizeValidationError"){
      throw new customArrayError(error.errors, "Validation error");
  }else{
      throw new Error(error)
  }
}

module.exports = { handleError}
