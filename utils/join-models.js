
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


    // http send stream header
    let timestamp = new Date().getTime();
    httpWritableStream.writeHead(200, {'Content-Type': 'application/force-download',
        'Content-disposition': `attachment; filename = ${timestamp}.json`});

    //TODO: Remove user session stub!!!
    let context = {
        acl : null
    };

    /*
        This is the main introspection loop. On each iteration the user would receive
        a new data raw. Accordingly to implementation of the constructRow function there
        is a possibility to generate different output formats, hide unnecessary columns, etc.
        This functionality is out of the scope of the current class and the constructRow
        implementation has to be overloaded to output real data. See the child classes to get
        more information.
     */
    while(true){

        // entering into the iterations from the head element
        cur = list.head;

        try {

            while(true){
                let rollback = false;
                cur = await cur.model_adj.func_find(cur, context);

                // no data found for the cur element of association chain => print, rollback or exit
                if(cur.model_adj.data === null){
                    // cur element was visited for the first time: augment offset and print the line
                    if(cur.model_adj.search_params.pagination.offset === 0){
                        cur = augmentOffsetFlushTrailing(cur);
                        break;
                    // cur element was visited before and has no data
                    }else{
                        // head has no more data, terminate
                        if(cur.prev === null){
                            return;
                        // cur has no data and was already printed
                        // goto prev, augment it's offset and try again
                        }else{
                            cur = cur.prev;
                            cur = augmentOffsetFlushTrailing(cur);
                            rollback = true;
                        }
                    }
                }

                // the last element was reached and it has data != null
                if(cur.next === null){
                    cur = augmentOffsetFlushTrailing(cur);
                    break;
                }

                // if it's not a rollback run - explore the next element
                if(!rollback)
                    cur = cur.next;
            }

            /*
                Send joined data raw to the end-user accordingly to the constructRow implementation.

                It should be stressed, that after the first element with data == null, all subsequent elements
                have no valid data. Also, as long as offsets are used to check if a given element was
                already visited (printed) or not, the offsets should not be modified within constructRow function,
                and it's interpretation is not direct.
             */

            let row_string = constructRow(list.head);
            await httpWritableStream.write(row_string);

        }catch(err){
            /*
                We can't throw an error to Express server at this stage because the response Content-Type
                was already sent. So we can try to attach it to the end of file.
             */
            console.log(err);
            await httpWritableStream.write(`{error : ${err.message}}\n`);
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

            // get record from database for the given offset
            // an output is an array that have one or zero elements
            cur.model_adj.data =  await cur.model_adj.func_getter(cur.model_adj.search_params, context);

            if( cur.model_adj.data.length === 0 ) {
                cur.model_adj.data = null;
            }else{
                cur.model_adj.data = cur.model_adj.data[0];
            }

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

                // get record from database for the given offset
                // an output is an array that have one or zero elements
                cur.model_adj.data = await cur.prev.model_adj.data[`${inflection.pluralize(cur.model_adj.name)}Filter`](cur.model_adj.search_params, context);

                if( cur.model_adj.data.length === 0 ){
                    cur.model_adj.data = null;
                }else{
                    cur.model_adj.data = cur.model_adj.data[0];
                }

                return cur;
            }
        } else{
            /*
             If you get this error, it means that there is no explicit link between cur.prev and cur elements.
             For example, it is the case when
            */

            throw Error(`No association from ${cur.prev.model_adj.name} to ${cur.model_adj.name} was detected`);
        }

    }

};

/*
    This helper function fills up a serach_params data structure. It's 'search' and 'order'
    elements would never change during the given transmission session. However the pagination
    parameter is important. The limit shell always be 1, and the offset is internal parameter of
    the current algorithm. It is prohibited to alter offset values from the outside world.
 */
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

/*
    This helper function is used to augment offset of the "cur" element.
    In this case offsets and data of the all trailing elements became invalid
    and shell be flushed.
 */
augmentOffsetFlushTrailing = function(cur){
    cur.model_adj.search_params.pagination.offset++;
    let next = cur.next;
    while(next !== null){
        next.model_adj.search_params.pagination.offset = 0;
        next.model_adj.data = null;
        next = next.next;
    }
    return cur;
};





/*
    The basic implementation of the constructRow function that prints model names and id's
    of the found elements. It is used for testing.

    ...
    individual[id:458] ->transcript_count[id:6]
    individual[id:459] ->transcript_count[id:2]
    individual[id:460]
    individual[id:461]
    individual[id:462] ->transcript_count[id:7]
    individual[id:462] ->transcript_count[id:10]
    individual[id:463] ->transcript_count[id:8]
    ...
 */

constructRow = function(head){

    let str = "";

    let cur = head;
    do{
        str = str.concat(`${cur.model_adj.name}[`);
        str = str.concat(`id:${cur.model_adj.data.id}] `);

        if(cur.next !== null && cur.next.model_adj.data === null)
            break;

        if(cur.next !== null)
            str = str.concat("->");

    }while(null !== (cur = cur.next));

    str = str.concat("\n");

    return str;
};


// curl -d '[ { "name"  : "individual"} , { "name" : "transcript_count"} ]' -H "Content-Type: application/json" http://localhost:3000/join