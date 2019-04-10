const XLSX = require('xlsx');
const Promise = require('bluebird');
const promise_csv_parse = Promise.promisify(require('csv-parse'));
const csv_parse = require('csv-parse');
const fs = require('fs');
const awaitifyStream = require('awaitify-stream');
const validatorUtil = require('./validatorUtil');
const admZip = require('adm-zip');


/**
 * replaceNullStringsWithLiteralNulls - Replace null entries of columns with literal null types
 *
 * @param  {array} arrOfObjs Each item correponds to a column represented as object.
 * @return {array}           Each item corresponds to a column and all items have either a valid entry or null type.
 */
replaceNullStringsWithLiteralNulls = function(arrOfObjs) {
  console.log(typeof arrOfObjs, arrOfObjs);
  return arrOfObjs.map(function(csvRow) {
    Object.keys(csvRow).forEach(function(csvCol) {
      csvCell = csvRow[csvCol]
      csvRow[csvCol] = csvCell === 'null' || csvCell === 'NULL' ?
        null : csvCell
    })
    return csvRow;
  });
}


/**
 * parseCsv - parse csv file (string)
 *
 * @param  {string} csvStr Csv file converted to string.
 * @param {string} delim Set the field delimiter in the csv file. One or multiple character.
 * @param {array|boolean|function} cols Columns as in csv-parser options.(true if auto-discovered in the first CSV line).
 * @return {array}        Each item correponds to a column represented as object and filtered with replaceNullStringsWithLiteralNulls function.
 */
exports.parseCsv = function(csvStr, delim, cols) {
  if (!delim) delim = ","
  if (typeof cols === 'undefined') cols = true
  return replaceNullStringsWithLiteralNulls(
    promise_csv_parse(csvStr, {
      delimiter: delim,
      columns: cols
    })
  )
}


/**
 * parseXlsx - description
 *
 * @param  {string} bstr Xlsx file converted to string
 * @return {array}      Each item correponds to a column represented as object and filtered with replaceNullStringsWithLiteralNulls function.
 */
exports.parseXlsx = function(bstr) {
  var workbook = XLSX.read(bstr, {
    type: "binary"
  });
  var sheet_name_list = workbook.SheetNames;
  return replaceNullStringsWithLiteralNulls(
    XLSX.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]])
  );
};

/**
 * Function that will delete a file if it exists and is insensitive to the
 * case when a file not exist.
 *
 * @param {String} path - A path to the file
 */
exports.deleteIfExists = function (path){
    console.log(`Removing ${path}`);
    fs.unlink(path, function (err){
        // file may be already deleted
    });
};

/**
 * Function deletes properties that contain string values "NULL" or "null".
 *
 * @param {Object} pojo - A plain old JavaScript object.
 *
 * @return {Object} A modified clone of the argument pojo in which all String
 * "NULL" or "null" values are replaced with literal nulls.
 */
exports.replacePojoNullValueWithLiteralNull = function(pojo) {
    if (pojo === null) {
        return null
    }
    let res = Object.assign({}, pojo);
    Object.keys(res).forEach((k) => {
        if(res[k].localeCompare("NULL", undefined, { sensitivity: 'accent' }) === 0){
            //res[k] = null
            delete res[k];
        }
    });
    return res
};


/**
* Parse by streaming a csv file and create the records in the correspondant table
* @function
* @param {string} csvFilePath - The path where the csv file is stored.
* @param {object} model - Sequelize model, record will be created through this model.
* @param {string} delim - Set the field delimiter in the csv file. One or multiple character.
* @param {array|boolean|function} cols - Columns as in csv-parser options.(true if auto-discovered in the first CSV line).
*/
exports.parseCsvStream = async function(csvFilePath, model, delim, cols) {

  if (!delim) delim = ",";
  if (typeof cols === 'undefined') cols = true;
  console.log("TYPEOF", typeof model);
  // Wrap all database actions within a transaction:
  let transaction = await model.sequelize.transaction();

  let addedFilePath = csvFilePath.substr(0, csvFilePath.lastIndexOf(".")) + ".json";
  let addedZipFilePath = csvFilePath.substr(0, csvFilePath.lastIndexOf(".")) + ".zip";

  console.log(addedFilePath);
  console.log(addedZipFilePath);

  try {
    // Pipe a file read-stream through a CSV-Reader and handle records asynchronously:
    let csvStream = awaitifyStream.createReader(
      fs.createReadStream(csvFilePath).pipe(
        csv_parse({
          delimiter: delim,
          columns: cols
        })
      )
    );

    // Create an output file stream
    let addedRecords = awaitifyStream.createWriter(
        fs.createWriteStream(addedFilePath)
    );

    let record;
    let errors = [];

    while (null !== (record = await csvStream.readAsync())) {

        console.log(record);
        record = exports.replacePojoNullValueWithLiteralNull(record);
        console.log(record);

        let error = validatorUtil.ifHasValidatorFunctionInvoke('validatorForCreate', model, record);

        if (!!error) {

            console.log(`Validation error during CSV batch upload: ${JSON.stringify(error)}`);
            error.record = record;
            errors.push(error);

        } else {

            await model.create(record, {
                transaction: transaction
            }).then(created => {

                // this is async, here we just push new line into the parallel thread
                // synchronization goes at endAsync;
                addedRecords.writeAsync(`${JSON.stringify(created)}\n`);

            }).catch(error => {
                console.log(`Caught sequelize error during CSV batch upload: ${JSON.stringify(error)}`);
                error.record = record;
                errors.push(error);
            })

        }
    }

    // close the addedRecords file so it can be sent afterwards
    await addedRecords.endAsync();

    if(errors.length > 0) {
      let message = "Some records could not be submitted. No database changes has been applied.\n";
      message += "Please see the next list for details:\n";

      errors.forEach(function(error) {
        message += `record ${JSON.stringify(error.record)} ${error.message}; \n`;
      });

      throw new Error(message.slice(0, message.length-1));
    }

    await transaction.commit();

    // zip comitted data and return a corresponding file path
    let zipper = new admZip();
    zipper.addLocalFile(addedFilePath);
    await zipper.writeZip(addedZipFilePath);

    console.log(addedZipFilePath);

    // At this moment the parseCsvStream caller is responsible in deleting the
    // addedZipFilePath
    return addedZipFilePath;

  } catch (error) {

    await transaction.rollback();

    exports.deleteIfExists(addedFilePath);
    exports.deleteIfExists(addedZipFilePath);

    throw error;

  } finally {
      exports.deleteIfExists(addedFilePath);
  }
};
