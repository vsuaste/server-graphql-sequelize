const searchArg = require('./search-argument');
/**
 * orderConditionsToMongoDb - build the sort object for default pagination. Default order is by idAttribute ASC
 * @param {array} order order array given in the graphQl query
 * @param {string} idAttribute idAttribute of the model
 *
 * @returns {object} sort object
 */
module.exports.orderConditionsToMongoDb = function(order, idAttribute){
  let sort = {};
  console.log(order)
  if (order !== undefined) {
    for (let item of order){
      if (item.order==="ASC"){
        sort[item.field] = 1
      } else {
        sort[item.field] = -1
      }
    }
  }
  if (!Object.keys(sort).includes(idAttribute)) {
    sort[idAttribute] = 1
  }
  return sort;
}
/**
 * 
 * @param {*} search 
 */
module.exports.searchConditionsToMongoDb = function(search){

  let filter;
  if (search !== undefined && search !== null) {    
    if (typeof search !== 'object') {
        throw new Error('Illegal "search" argument type, it must be an object.');
    }
    let arg = new searchArg(search);
    filter = arg.toMongoDb();
  }
  return filter;
}

