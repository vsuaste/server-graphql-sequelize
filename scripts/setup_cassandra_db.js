const {
  cassandraClient
} = require('../connection');
const migrations_cassandra = require('../migrations-cassandra/index');
const {
  getModulesSync
} = require('../utils/module-helpers');
// This only does the migration once and create the db_migrated table. migrations won't be rerun for newly added models. 

// require all cassandra migrations
const migrations_cassandra = {};
getModulesSync(__dirname, +"../migrations/default-cassandra").forEach(file => {
  let migration = require('./' + file);
  migrations_cassandra[file.slice(0,file.length -3)] = migration
});

async function createTableMigrated() {
  const tableQuery = "SELECT table_name FROM system_schema.tables WHERE keyspace_name='sciencedb';"
  let result = await cassandraClient.execute(tableQuery);
  console.log('Check for tables in keyspace "sciencedb" executed');
  let tablePresent = false;
  let migrateToDo = true;
  for (let i = 0; i < result.rowLength; i++) {
    if (result.rows[i].table_name === 'db_migrated') {
      tablePresent = true;
      console.log('Migration table found.');
    }
  }
  if (tablePresent) {
    let queryMigration = "SELECT migrated_at FROM db_migrated;"
    result = await cassandraClient.execute(queryMigration);
    if (result.rowLength >= 1) {
      migrateToDo = false;
      console.log('Migration table filled, no more migration to do.');
      return process.exit(0);
    }
  }
  if (migrateToDo) {

    await Promise.allSettled(Object.values(migrations_cassandra).map(async cassandraHandler => await cassandraHandler.up()));
    const createTable = "CREATE TABLE IF NOT EXISTS db_migrated ( migrated_at timeuuid PRIMARY KEY )";
    await cassandraClient.execute(createTable);
    console.log('Migration table created');
    const rowInsert = "INSERT INTO db_migrated (migrated_at) VALUES (now())";
    await cassandraClient.execute(rowInsert);
    console.log('Migration table filled.');
    return process.exit(0);
  }
}

createTableMigrated();