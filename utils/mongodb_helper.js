const searchArg = require('./search-argument');
/**
 * orderConditionsToMongoDb - build the sort object for default pagination. Default order is by idAttribute ASC
 * @param {array} order order array given in the graphQl query
 * @param {string} idAttribute idAttribute of the model
 *
 * @returns {object} sort object
 */
module.exports.orderConditionsToMongoDb = function(order, idAttribute, isForwardPagination){
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
    sort[idAttribute] = isForwardPagination ? 1 : -1
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

/**
 * mergeMongoDbFilters - merge two filters into a new filter.
 * @param {object} filterA first filter object of the form: {field: {[OP]: "value"}}
 * @param {object} filterB second filter object of the form: {field: {[OP]: "value"}}
 * @param {object} operator operator to combine filterA and filterB. Valid operators are 'and' or 'or'. default is 'and'.
 */
module.exports.mergeMongoDbFilters = function (filterA, filterB, operator) {
  if(operator && (operator !=='and' || operator !=='or')) throw new Error('Only "and" or "or" operators are valid.');
  let mergeOp = operator ? "$"+operator : '$and';
  //check: no arguments
  if(!filterA && !filterB) {
    return {};
  }
  //check: only whereB
  if(!filterA && filterB) {
    return filterB;
  }
  //check: only whereA
  if(filterA && !filterB) {
    return filterA;
  }
  //check: types
  if(typeof filterA !== 'object' || typeof filterB !== 'object') {
    throw new Error('Illegal arguments provided to mergeMongoDbFilters function.');
  }
  return { [mergeOp]: [filterA, filterB] }
}

/**
 * parseOrderCursor - Parse the order options and return the where statement for cursor based pagination (forward)
 *
 * Returns a set of {AND / OR} conditions that cause a ‘WHERE’ clause to deliver only the records ‘greater that’ a given cursor.
 *
 * The meaning of a record being ‘greater than’ a given cursor is that any of the following conditions are fullfilled for the given cursor,
 * order set and idAttribute:
 *
 *    (1) At least the idAttribute of the record is greater than the idAttribute of the cursor if the idAttribute’s order is ASC,
 *    or smaller than if it is DESC.
 *
 *    This condition is sufficient to the record being ‘greater than’ a given cursor, but not strictly necessary.
 *    That is, if some field, different of the idAttribute, appears before the idAttribute on the order array,
 *    and this field fulfills condition 2.a, then the record is considered being ‘greater than’ the given cursor.
 *
 *    (2) If other fields different from idAttribute are given on the order set, as entries of the form [value, ORDER], then, starting from
 *    the first entry, we test the following condition on it:
 *
 *        a) If record.value  is [ > on ASC, or  < on DESC] than cursor.value, then this record is greater than the given cursor.
 *        b) If record.value  is equal to  cursor.value,  then:
 *            i) test the next value on cursor set to determine if it fullfils condition 1) or some of the subconditions 2).[a, b, c],
 *               in order tho determine if the record is 'greater than', or not, the given cursor.
 *        c) else: this record is not greater than the given cursor.
 *
 *
 *
 * @param  {Array} order  Order entries. Must contains at least the entry for 'idAttribute'.
 * @param  {Object} cursor Cursor record taken as start point(exclusive) to create the filter object.
 * @param  {String} idAttribute  idAttribute of the calling model.
 * @param  {Boolean} includeCursor Boolean flag that indicates if a strict or relaxed operator must be used for produce idAttribute conditions.
 * @return {Object}        filter object which is used for retrieving records after the given cursor holding the order conditions.
 */
module.exports.parseOrderCursor = function(order, cursor, idAttribute, includeCursor){
  /**
   * Checks
   */
  //idAttribute:
  if(idAttribute===undefined||idAttribute===null||idAttribute===''){
    return {};
  }
  //order: must have idAttribute
  if(!order||!order.length||order.length===0||
    !order.map( orderItem=>{return orderItem[0] }).includes(idAttribute)) {
      return {};
  }
  //cursor: must have idAttribute
  if(cursor===undefined||cursor===null||typeof cursor!=='object'||cursor[idAttribute] === undefined){
    return {};
  }

  /**
   * Construct AND/OR conditions using a left-recursive grammar (A => Aa).
   *
   * The base step of the recursion will produce the conditions for the last entry (most right) on the order-array.
   * And each recursive step will produce the conditions for the other entries, starting from the last to the first (from right to left).
   *
   *    order: [ [0], [1], [2], ..., [n]]
   *             |<----------|        |
   *             recursive steps      base step
   *             from right to left
   *
   */
  //index of base step
  let last_index = order.length-1;
  //index of the starting recursive step
  let start_index = order.length-2;

  /*
    * Base step.
    */

  /*
    * Set operator for base step.
    */
  //set operator according to order type.
  let operator = order[last_index][1] === 1 ? 'gte' : 'lte';
  //set strictly '>' or '<' for idAttribute (condition (1)).
  if (!includeCursor && order[last_index][0] === idAttribute) { operator = operator.substring(0, 2); }

  /*
    * Produce condition for base step.
    */
  let filter = {
    [order[last_index][0]]: { ["$"+operator]: cursor[order[last_index][0]] }
  }

  /*
    * Recursive steps.
    */
  for( let i= start_index; i>=0; i-- ){

    /**
     * Set operators
     */
    //set relaxed operator '>=' or '<=' for condition (2.a or 2.b)
    operator = order[i][1] === 1 ? 'gte' : 'lte';
    //set strict operator '>' or '<' for condition (2.a).
    let strict_operator = order[i][1] === 1 ? 'gt' : 'lt';
    //set strictly '>' or '<' for idAttribute (condition (1)).
    if(!includeCursor && order[i][0] === idAttribute){ operator = operator.substring(0, 2);}

    /**
     * Produce: AND/OR conditions
     */
    filter = {
      ['$and'] :[
        /**
         * Set
         * condition (1) in the case of idAttribute or
         * condition (2.a or 2.b) for other fields.
         */
        { [order[i][0] ] : { ["$"+operator]: cursor[ order[i][0] ] } },

        { ['$or'] :[
          /**
           * Set
           * condition (1) in the case of idAttribute or
           * condition (2.a) for other fields.
           */
          { [order[i][0]]: { ["$"+strict_operator]: cursor[ order[i][0] ]} },

          /**
           * Add the previous produced conditions.
           * This will include the base step condition as the most right condition.
           */
          filter  ]
        }
      ]
    }
  }
  return filter
}

/**
 * cursorPaginationArgumentsToMongoDb - translate cursor based pagination object to the filter object.
 * merge the original searchArguement and those needed for cursor-based pagination
 * @see parseOrderCursor
 *
 * @param {object} pagination cursor-based pagination object
 * @param {object} sort sort object
 * @param {object} filter filter object
 * @param {string} idAttribute idAttribute of the model
 */
module.exports.cursorPaginationArgumentsToMongoDb = function(pagination, sort, filter, idAttribute) {
  if (pagination) {
    if (pagination.after || pagination.before){
      let cursor = pagination.after ? pagination.after : pagination.before;
      let decoded_cursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      let filterB = module.exports.parseOrderCursor(sort, decoded_cursor, idAttribute, pagination.includeCursor);
      filter = module.exports.mergeMongoDbFilters(filter, filterB);
    }
  }
}
