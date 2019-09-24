const path = require('path');
const resolvers = require(path.join(__dirname, '..', 'resolvers', 'index.js'));
const inflection = require('inflection');

module.exports = async function(context, body_info, writableStream ){
      //get resolver name for model
      let model_name = body_info.model;
      let getter_resolver = inflection.pluralize(model_name.slice(0,1).toLowerCase() + model_name.slice(1, model_name.length));

      let batch_step = {
        limit: 2,
        offset: 0
      }

      let count_resolver = 'count'+inflection.pluralize(model_name.slice(0,1).toUpperCase() + model_name.slice(1, model_name.length));
      let total_records = resolvers[count_resolver](_, context);
      console.log("TOTAL NUMBER OF RECORDS TO STREAM: ", total_records);

      // http send stream header
      let timestamp = new Date().getTime();
      writableStream.writeHead(200, {'Content-Type': 'application/force-download',
          'Content-disposition': `attachment; filename = ${timestamp}.json`});

      while(batch_step.offset <= total_records){

        try{
          await data = await resolvers[getter_resolver]({pagination: batch_step}, context);
          await writableStream.write(data);
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
