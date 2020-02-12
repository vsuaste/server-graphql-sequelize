
class customArrayError extends Error {
  constructor(errors_array, message){
    super();
    this.message = message;
    this.errors = errors_array;
  }
}

handleError = function(error){
  if(error.message === 'validation failed'){
    throw new customArrayError(error.errors, error.message);
  }else if(error.name === "SequelizeValidationError"){
      throw new customArrayError(error.errors, "Validation error");
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    throw new Error(`Time out exceeded trying to reach server ${error.url}`);
  }else{
      throw new Error(error)
  }
}
module.exports = { handleError}
