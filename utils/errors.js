const { GraphQLError } = require('graphql');
const helper = require('./helper')
const globals = require('../config/globals');

/**
 * Class representing a Cenzontle Error containing according to GraphQL Errors spec.
 * @extends Error
 */
module.exports.CenzontleError = class CenzontleError extends Error{
  /**
   * Create a Cenzontle Error.
   * @param {String} message - A message describing the Error for debugging purposes..
   * @param {Array} path - An array describing the JSON-path into the execution response which
   * corresponds to this error. Only included for errors during execution.
   * @param {Array} locations - An array of { line, column } locations within the source GraphQL document
   * which correspond to this error.
   * @param {Object} extensions - Extension fields to add to the formatted error.
   */
  constructor({message, path, locations, extensions}) {
    super();
    this.message = message;
    this.path = path;
    this.locations = locations;
    this.extensions = extensions
  }
}

/**
 * handleRemoteErrors - handles incoming errors from remote servers
 * @param {Array} errs - Array of errors (benign) or single more serious error send in the response from the remote server
 * @param {Array} multErrsMessage - Error message to be used by the returned Cenzontle Error
 * 
 * @return {CenzontleError} If serious single Error return as Cenzontle Error, else build custom Cenzontle Error
 * with given message and Errors in Extensions
 */
module.exports.handleRemoteErrors = function( errs, multErrsMessage ) {
  if ( helper.isNonEmptyArray( errs ) ) {
    // Only a SINGLE error was sent
    if ( errs.length === 1 ) {
      let e = errs[0]
      // properties of e will be automatically extracted
      // with named arguments (destructuring)
      return new module.exports.CenzontleError( e )
    } else if ( errs.length > 1 ) {  // actually length > 1 is a given here, isn't it?
      return new module.exports.CenzontleError( {message: multErrsMessage, extensions: errs} )
    }
  } else {
   return null
  }
}

/**
 * isRemoteGraphQlError - checks if an Error is a remote GraphQLError
 * @param {Error} error - The error to check
 * 
 * @return {Boolean} True if the error has the properties of a GraphQLError send by a remote Server
 */
module.exports.isRemoteGraphQlError = function( err ) {
  return err.response && err.response.data && Array.isArray( err.response.data.errors )
}

/**
 * stringifyCompletely - completely stringifies an error (including non-enumerable Keys)
 * @param {Error} error - The error to stringify
 * @param replacer - Either a function or an array used to transform the result. The replacer is called for each item.
 * @param space - Optional. Either a String or a Number. A string to be used as white space (max 10 characters),
 * or a Number, from 0 to 10, to indicate how many space characters to use as white space.
 * @return {String} String of the error to cast
 */
module.exports.stringifyCompletely = function(error, replacer, space) {
  let allKeys = Reflect.ownKeys(error);
  let errorMap = {};
  for (let key of allKeys) {
    errorMap[`${key}`] = error[`${key}`];
  }
  return JSON.stringify(errorMap, replacer, space);
}

/**
 * customErrorLog - Log the errors depending on the env Variable "ERROR_LOG".
 *                  Default is "compact". If specifically set to "verbose" errors
 *                  will be logged with all properties (including graphQLError properties)
 * 
 * @param {Error} error - error to be logged
 */
module.exports.customErrorLog = function(error) {
  if (globals.ERROR_LOG.toUpperCase() === "VERBOSE") {
    console.error(module.exports.stringifyCompletely(error,null,2))
  } else { //if not verbose default should be "compact", if for some reason another env was given it should still be compact
    console.error(error)
    if (error.originalError !== undefined) {
      console.error("OriginalError:\n" + JSON.stringify(error.originalError,null,2));
    }
  }
}

/**
 * Class representing a BeningError reporter which is able to add benignErrors to the context.
 */
module.exports.BenignErrorReporter = class BenignErrorReporter {
  /**
   * Create a BenignErrorReporter.
   * @param {Object} context - holds contextual information like the resquest query and user info
   */
  constructor(context) {
    this.graphQlContext = context;
  }
  
  /**
   * reportError - adds the passed errors to the graphQLContext
   * @param errors - errors from the httpResponse of another graphQL server
   */
  reportError(errors) {
    if (helper.isNotUndefinedAndNotNull(errors)) {
      if (Array.isArray(errors)) {
        this.graphQlContext.benignErrors.push(...errors);
      } else {
        this.graphQlContext.benignErrors.push(errors);
      }
    }   
  }
}

/**
 * handleErrorsInGraphQlResponse - calls the benignErrorReporter to add the Errors
 * @param {Object} httpResponseData - Data send from the remote server, that might contain benignErrors
 * @param {BenignErrorReporter} benignErrorReporter - The BenignErrorReporter that holds the context
 */
module.exports.handleErrorsInGraphQlResponse = function(httpResponseData, benignErrorReporter) {
  // TODO
  // check if has errors
  // if so extract - and maybe even convert?
  benignErrorReporter.reportError( httpResponseData.errors )
}

/**
 * defaultBenignErrorReporter - If no benignErrorReporter is given this default reporter, which just throws the errors
 * will instead be used (Used mainly for being able to require a model independently of a given context)
 */
module.exports.defaultBenignErrorReporter = {
  reportError: function( errors ) {
    throw errors
  }
}

/**
 * getDefaultBenignErrorReporterIfUndef - checks whether a benignErrorReporter is given (one that actually holds a context)
 * if not return the defaultBenignErrorReporter Object
 * @param {BenignErrorReporter} benignErrorReporter - The BenignErrorReporter that holds the context
 */
module.exports.getDefaultBenignErrorReporterIfUndef = function(benignErrorReporter) {
  return ( !helper.isNotUndefinedAndNotNull(benignErrorReporter) ) ? module.exports.defaultBenignErrorReporter : benignErrorReporter
}




module.exports.handleError = function(error){
  throw new Error(error);
}

/*constructErrorForLogging = function(error) {
  if(error.message){
    return transformDetailsAndReturnError(error, error.message);
  }else if(error.name === "SequelizeValidationError"){
    return transformDetailsAndReturnError(error, "Validation error.");
  }else if(error.code === 'ECONNABORTED' && error.url!== undefined){
    return new GraphQLError(`Time out exceeded trying to reach server ${error.url}`);
  }else{
    return transformDetailsAndReturnError(error, "");
  }
}*/