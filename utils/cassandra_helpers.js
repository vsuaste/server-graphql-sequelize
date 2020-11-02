
const _ = require('lodash');
const helper = require('./helper');

/**
 * order records records recieved from multiple cassandra-adapters. ordering by token
 * @param {array} matchingRecords 
 */
module.exports.orderCassandraRecords = function(matchingRecords) {
  return _.sortBy(matchingRecords, [(record) => {return record.toke.toNumber()}]);
}

/**
 * 
 * @param {*} search 
 * @param {*} allowFiltering 
 */
module.exports.searchConditionsToCassandra = function(search, allowFiltering){

  let whereOptions = '';
  if (search !== undefined && search !== null) {    
    if (typeof searchTerms !== 'object') {
        throw new Error('Illegal "search" argument type, it must be an object.');
    }
    let arg = new searchArg(search);
    whereOptions = 'WHERE ' + arg.toCassandra(definition.attributes, allowFiltering) + ';';
  }
  return whereOptions;
}

/*
* In this section, a special operator is used: "tgt", meaning "TOKEN > TOKEN".
* This operator is implemented in utils/search-argument.js, toCassandra(idAttribute, allowFiltering)
*
* The Cassandra database is ordered by the TOKEN of the ID value, so if we want to cut away entries above the cursor,
* we need to enforce the condition TOKEN(id) > TOKEN(cursor_id), which is realized here by: id TGT cursor_id
*/
module.exports.cursorPaginationArgumentsToCassandra = function(search, offsetCursor, idAttribute) {
  
  let cassandraSearch = Object.assign({},search);
  if (helper.isNotUndefinedAndNotNull(offsetCursor)) {
    let decoded_cursor = JSON.parse(helper.base64Decode(offsetCursor));
    let cursorId = decoded_cursor[idAttribute];
    cassandraSearch  = {
        field: 'book_id',
        value: {
            value: cursorId
        },
        operator: 'tgt',
        search: undefined
    };
    if (helper.isNotUndefinedAndNotNull(search)) {
        // -- Use *both* the given search condition and the cursor --
        cassandraSearch = {
            operator: 'and',
            search: [search, cursorSearchCondition]
        };
    } else {
        // -- Use only the cursor --
        cassandraSearch = cursorSearchCondition;
    }
  }
  return cassandraSearch;
}

