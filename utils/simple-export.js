const path = require('path');
const resolvers = require(path.join(__dirname, '..', 'resolvers', 'index.js'));
const inflection = require('inflection');
const schema = require('./graphql_schema');

getAttributes = function( model_name ){
    return schema.getModelFieldByAnnotation(model_name, '@original-field');
}

crateHeaderCSV = function(attributes){
  let str_header = "";
  attributes.forEach( att =>{
    str_header+= att+",";
  } )
  str_header= str_header.replace(/.$/,"\n");

  return str_header;
}

asyncForEach = async function(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

jsonToCSV = function(row_data, attributes){
  let str_csv = "";
  attributes.forEach( att => {
    if(row_data[att]===null || row_data[att] === undefined){
      str_csv+='NULL,';
    }else {
      str_csv+= row_data[att]+",";
    }
  })

  str_csv= str_csv.replace(/.$/,"\n");
  return str_csv;
}

// wait ms milliseconds
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}


module.exports = async function(context, body_info, writableStream ){
      //get resolver name for model
      let model_name = body_info.model;
      let getter_resolver = inflection.pluralize(model_name.slice(0,1).toLowerCase() + model_name.slice(1, model_name.length));

      //get count resolver
      let count_resolver = 'count'+inflection.pluralize(model_name.slice(0,1).toUpperCase() + model_name.slice(1, model_name.length));
      let total_records = await resolvers[count_resolver]({}, context);
      console.log("TOTAL NUMBER OF RECORDS TO STREAM: ", total_records);

      //pagination
      let batch_step = {
        limit: 1,
        offset: 0
      }

      // http send stream header
      let timestamp = new Date().getTime();
      writableStream.writeHead(200, {'Content-Type': 'application/force-download',
          'Content-disposition': `attachment; filename = ${timestamp}.csv`});

      //get attributes names
      let attributes = getAttributes(model_name);

      //write csv header
      let csv_header = crateHeaderCSV(attributes);
      await writableStream.write(csv_header);

      while(batch_step.offset < total_records){

        try{
           data = await resolvers[getter_resolver]({pagination: batch_step},context);

           await asyncForEach(data, async (record) =>{
              let row = jsonToCSV(record.dataValues, attributes);
              await  writableStream.write(row);
           })
          batch_step.offset = batch_step.offset + batch_step.limit;
        }catch(err){
          /*
              We can't throw an error to Express server at this stage because the response Content-Type
              was already sent. So we can try to attach it to the end of file.
           */
          console.log(err);
          await writableStream.write(`{error : ${err.message}}\n`);
          return;
        }

      }
}
