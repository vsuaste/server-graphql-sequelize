const jwt =  require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const secret = 'something-secret';


/**
 * @function - Given a context this function check if the user(implicit in context)
 * is allowed to perform 'permission' action to the 'resource' model.
 *
 * @param  {object} context    context object contains the request info and the acl rules.
 * @param  {string} resource   resource to which the user wants to perform an action (i.e. a model).
 * @param  {string} permission action that the user wants to perform to resourse (i.e. read, edit, create).
 * @return {boolean}            Return true if within the context the user is allowed to perform 'permission' action to the 'resource' model.
 */
module.exports = function( context, resource, permission ) {
  //if there's not authorization rules set
  if (context.acl == null) return true;

  let token =  context.request.headers["authorization"];
  try{
    //Identify user from context
    let decoded = jwt.verify(token, secret);
    //check for permissions of that specific user
    let allowed = context.acl.isAllowed(decoded.id, resource, permission);
    console.log(typeof decoded.id, ' * ' ,decoded.id);
    if(allowed){
      return true;
    }else{
      //no permission for user
      console.log("Permission dennied...");
      return false;
    }
  }catch(err){
    //invalid token
    console.log("invalid token...");
    return false;
  }
}
