
// here I can list all existing local models with their names
const models = require('../models/index');
const resolvers = require('../resolvers/index');
const inflection = require('inflection');
var LinkedList = require('linked-list');

// TODO: no index inside web-service models
//const webServiceModels = require('../models-webservice/index.js');

// modelAdjacencies is an array of JSON objects of the form:
// '[ { "name" : "A" } , { "name" : "B" } ]'

// joinModels is called by express server directly. This function execution can take
// a long time so it should not be blocking and should not produce long call stack chains
module.exports.joinModels = async function(modelAdjacencies, httpWritableStream) {

    if ( ! modelAdjacencies || modelAdjacencies.length === 0)
        throw Error(`modelAdjacencies array is undefined`);

    // create a linked list from the input adjacency array
    // this list will always keep the current model and the next model that is more useful than
    // a plain array
    let list = new LinkedList;

    for(let model_adj of modelAdjacencies) {
        let item = new LinkedList.Item();
        item.model_adj = model_adj;
        list.append(item);
    }

    // iterate over the list and add some useful information to it's elements
    let cur = list.head;
    do{

        // required on this step input data validation
        if( ! cur.model_adj.name ) throw Error(`Model name is not defined in ${JSON.stringify(cur.model_adj)}`);
        if( ! models[cur.model_adj.name] ) throw Error(`Model with name ${cur.model_adj.name} not exist`);

        // store raw names of the model attributes
        let model = models[cur.model_adj.name];
        cur.model_adj.attributes = [];
        for(let attribute_name of Object.keys(model.rawAttributes))
            cur.model_adj.attributes.push(attribute_name);

        // function that searches by criteria and offset instances of the given model_adj
        cur.model_adj.func_findNext = defineFindNext(cur);

        // generic function that searches for this model by criteria
        cur.model_adj.func_findThis = resolvers[inflection.pluralize(cur.model_adj.name)];

        // not used before offset for the current model
        cur.model_adj.offset = 0;

        // current data (at the moment of introspect - it's invalid, but at the moment of
        // func_findNext - is valid)
        cur.model_adj.data = null;

    }while(null !== (cur = cur.next));


    // print list elements
    /*cur = list.head;
    do{
        console.log(cur.model_adj);
    }while(null !== (cur = cur.next));*/


    // http send stream header
    let timestamp = new Date().getTime();
    httpWritableStream.writeHead(200, {'Content-Type': 'application/force-download',
        'Content-disposition': `attachment; filename = ${timestamp}.json`});

    while(true){
        /*
        Function introspect will add "data" field to each adjacency
        and will augment required offset for next call

        In the case that there is no data, this function will return "false" object.
         */

        try {

            list.head = await introspect(list.head);

            if (list.head.model_adj.data !== null) {

                // send complete joined data raw to the end-user
                let row_string = constructRow(list.head);
                await httpWritableStream.write(row_string);

            } else {
                //TODO: redirect to success page from
                break;
            }
        }catch(err){
            /*
                We can't throw an error to Express at this stage because the response Content-Type
                was already sent. So we can try to attach it to the end of file.
             */
            console.log(err.message);
            await httpWritableStream.write(`{error : ${err.message}`);
            return;
        }
    }
};

defineFindNext = function (cur){

    // get curr adjacency data and if not null - increment offset
    // if id_ for the next adjacency is not null - return introspect
    // if id_ for the next adjacency is null - do not increment anything and just return
    // if we are on the first adjacency and the is a null result - just return false
    // do not catch any errors - they will be cached automatically in the caller function

    // there is no findNext function for the list tail
    if(cur.next === null)
        return null;

    let cur_model = models[cur.model_adj.name];
    let next_model = models[cur.next.model_adj.name];

    // cur.model_adj.func_search = resolvers[inflection.pluralize(cur.model_adj.name)];
    // model name that stores private keys of the given model_adj
    // TODO: ...

    // returns modified model_adj_item (with offset moved, and data filled)
      return function(cur){

          console.log(`findNext invoked for ${cur.model_adj.name}`);
          //TODO: cur.next.model_adj.data = ...(cur.data ... cur.next.offset)...
          //TODO: cur.next.model_adj.offset++;
          //if(...data != null... && cur.next.func_findNext != null)
          // cur.next.next = cur.next.func_findNext(cur.next);

          console.log("PRINT ASSOCIATIONS");
          console.log(cur_model.getAssociations(next_model)[0].);
          console.log("<<<<<<<<<<<<<<<<<<<");

          return cur.next;
      }
};

/*
    to find next data I need to have a valid cur data
 */
introspect = async function (head){

    let params = {};

    params.pagination = {
        offset : head.model_adj.offset,
        limit : 1
    };

    if( ! head.model_adj.search)
        params.search = head.model_adj.search;

    if( ! head.model_adj.order)
        params.order = head.model_adj.order;

    //TODO: Remove user session stub!!!
    let context = {
        acl : null
    };

    head.model_adj.data = await head.model_adj.func_findThis(params, context);
    if( head.model_adj.data.length === 0 ) head.model_adj.data = null;
    head.model_adj.offset++;

    //TODO: Remove this
    //console.log("INTROSPECTION STARTED");
    //console.log(head.model_adj.data);

    // explore subsequent objects recursively
    if(head.model_adj.data != null && head.model_adj.func_findNext != null)
        head.next = head.model_adj.func_findNext(head);



    return head;
};

constructRow = function(model_adj_head){
    return `raw constructed`;
};

// curl -d '[ { "name"  : "individual", "cur_id" : 1 } , { "name" : "transcript_count" , "cur_id" : 2} ]' -H "Content-Type: application/json" http://localhost:3000/join