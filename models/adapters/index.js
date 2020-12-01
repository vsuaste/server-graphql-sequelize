const { existsSync }     = require('fs');
const { join }           = require('path');
const { getModulesSync } = require('../../utils/module-helpers');

let adapters = {
  sqlDatabases: {},
  mongoDbs: {}
};
module.exports = adapters;

getModulesSync(__dirname).forEach(file => {

  let adapter = require(join(__dirname, file));

  if( adapters[adapter.adapterName] ){
    throw new Error(`Duplicated adapter name ${adapter.adapterName}`);
  }

  switch(adapter.adapterType) {
    case 'ddm-adapter':
    case 'zendro-webservice-adapter':
    case 'generic-adapter':
      adapters[adapter.adapterName] = adapter;
      break;

    case 'sql-adapter':
      adapters.sqlDatabases[adapter.adapterName] = adapter.definition;
      adapters[adapter.adapterName] = adapter;
      break;

    case 'mongodb-adapter':
      adapters.mongoDbs[adapter.adapterName] = adapter.definition;
      adapters[adapter.adapterName] = adapter;
      break;
    case 'default':
      throw new Error(`
        Adapter storageType '${adapter.storageType}' is not supported`
      );
  }

  let patches_patch = join(__dirname,'..','..','patches', file);

  if(existsSync(patches_patch)) {
    adapter = require(`${patches_patch}`).logic_patch(adapter);
  }

});
