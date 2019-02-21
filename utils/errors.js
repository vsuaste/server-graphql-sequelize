
class customArrayError extends Error {
  constructor(errors_array, message){
    super();
    this.message = message;
    this.errors = errors_array;
  }
}

handleError = function(error){
  if(error.name === "SequelizeValidationError"){
      console.log("Validation error")
      let errorC = new customArrayError(error.errors, "Validation error");
      console.log( errorC );
      throw errorC;

  }else{
      console.log('Other error')
      throw new Error(error)
  }
}

module.exports = { handleError}
