
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

        // current data (is initialized by the 'func_find' call)
        cur.model_adj.data = null;

        // in the case when SELECT query that is formed by func_find method can return
        // a collection of database records, those can be filtered and ordered accordingly
        // to "find_params" structure. This structure also includes "offset" initialized to 0
        cur.model_adj.search_params = defineSearchParams(cur);

        // function that searches by criteria and offset instances of the given model_adj
        cur.model_adj.func_find = defineFindFunction(cur);

    }while(null !== (cur = cur.next));

    //TODO: Kill this
    /*cur = list.head;
    do{
        console.log(cur.model_adj);
    }while(null !== (cur = cur.next));*/


    // http send stream header
    let timestamp = new Date().getTime();
    httpWritableStream.writeHead(200, {'Content-Type': 'application/force-download',
        'Content-disposition': `attachment; filename = ${timestamp}.json`});

    //TODO: Remove user session stub!!!
    let context = {
        acl : null
    };

    while(true){
        /*
        Function introspect will add "data" field to each adjacency
        and will augment required offset for next call

        In the case that there is no data, this function will return "false" object.
         */

        try {

            // iterate over the list of associated models
            cur = list.head;
            do{
                console.log(`Get data for: ${cur.model_adj.name}`);
                cur = await cur.model_adj.func_find(cur, context);

                // no data found for the cur element of association chain
                if(cur.model_adj.data === null)
                    break;

            }while(null !== (cur = cur.next));

            console.log("out from introspection iterator");

            // the end of the introspection is reached when there is no mode data in the head
            // list element
            if(cur === list.head && cur.model_adj.data === null) break;

            // send complete joined data raw to the end-user
            // here the data line terminates with the first data == null and not
            // necessary with the tail element
            let row_string = constructRow(list.head);
            await httpWritableStream.write(row_string);

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

/*
    Function use offset to retrieve corresponding data for the current list element according
    to the current offset. This function will renew the cur.model_adj.data and augment
    the cur.model_adj.offset field. If there is no data for the current offset, the
    cur.model_adj.data will be set to null.

    It is assumed, that cur->prev element has already initialized it's data field. If cur->prev is null, it means that
    we are working with the list head. If after calling this function, the cur.model_adj.data is null,
    it means that there is nothing mode to do, and the JOIN process has successfully completed.
*/

defineFindFunction = function (cur){


    if(cur.prev === null){

        // cur is the head element of the list
        return async function(cur, context){

            // for head getter function has to be estimated just once
            if( ! cur.model_adj.func_getter)
                cur.model_adj.func_getter = resolvers[inflection.pluralize(cur.model_adj.name)];

            // database query
            cur.model_adj.data =  await cur.model_adj.func_getter(cur.model_adj.search_params, context);

            //TODO: not a nice check
            if( cur.model_adj.data.length === 0 ) {
                cur.model_adj.data = null;
            }else{
                cur.model_adj.data = cur.model_adj.data[0];
            }

            // head offset never gets back to it's initial value of 0
            cur.model_adj.search_params.pagination.offset++;

            return cur;
        }

    } else {

        let model_prev = models[cur.prev.model_adj.name];

        //********************DRY CODE*****************************
        //TODO: Add association information inside a model generator
        const nameAssocLc = cur.model_adj.name;
        const nameAssocPl = inflection.pluralize(nameAssocLc);

        //TODO: Here are associoation name that sohuld not coincide with the target model name!!!
        //<%- nameLc -%>.prototype.<%=associations_one[i].name%>
        let func_toOneGetter = model_prev.prototype[nameAssocLc];

        //<%- nameLc -%>.prototype.<%=associations_temp[i].name%>Filter --> associations_temp ???
        let func_toManyGetter = model_prev.prototype[`${nameAssocPl}Filter`];
        //********************^^^^^^^^^^*****************************


        if(typeof func_toOneGetter === "function"){

            // there is just one cur element can be found from the cur.prev that
            // corresponds to the hasOne or belongsTo of the prev->cur association type
            return async function(cur, context){
                console.log(`Invoking func_toOneGetter stub`);
                return cur;
            }
        } else if(typeof func_toManyGetter === "function"){
            //TODO: Apply filters and ordering
            // returns modified model_adj_item (with offset moved, and data filled)
            return async function(cur, context){

                // database query
                cur.model_adj.data = await cur.prev.model_adj.data[`${inflection.pluralize(cur.model_adj.name)}Filter`](cur.model_adj.search_params, context);

                //TODO: not a nice check
                if( cur.model_adj.data.length === 0 ){
                    cur.model_adj.data = null;
                    cur.model_adj.search_params.pagination.offset = 0;
                }else{
                    cur.model_adj.search_params.pagination.offset++;
                }

                return cur;
            }
        } else{
            //TODO: Ask if we are using always symmetrical associations? Add that to the documentation!!!
            throw Error(`No association from ${cur.prev.model_adj.name} to ${cur.model_adj.name} was detected`);
        }

    }

};


defineSearchParams = function(cur){
    let search_params = {};

    search_params.pagination = {
        offset : 0,
        limit : 1
    };

    //TODO: Test filtering
    if( ! cur.model_adj.search )
        search_params.search = cur.model_adj.search;

    //TODO: Test ordering
    if( ! cur.model_adj.order )
        search_params.order = cur.model_adj.order;

    return search_params;
};







constructRow = function(head){

    let str = "";

    let cur = head;
    do{
        str = str.concat(cur.model_adj.name);

        if(cur.next.model_adj.data === null)
            break;

        if(cur.next !== null)
            str = str.concat("->");

    }while(null !== (cur = cur.next));

    str = str.concat("\n");

    return str;
};


// curl -d '[ { "name"  : "individual", "cur_id" : 1 } , { "name" : "transcript_count" , "cur_id" : 2} ]' -H "Content-Type: application/json" http://localhost:3000/join