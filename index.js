var Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , sh = require('shelljs')
  , o = 0
  , Resource = require('deployd/lib/resource')
  , util = require('util')
  , path = require('path')
  , waiter
  , log = function() {}

function Importer() {
  Resource.apply(this, arguments);
}
module.exports = Importer;
util.inherits(Importer, Resource);

Importer.dashboard = {
  path: path.join(__dirname, 'dashboard')
}

Importer.prototype.handle = function (ctx) {
  if(ctx.method === 'POST' && ctx.req.isRoot) {
    waiter = function (err) {
      ctx.done(err);
    }
    
    log = function (data) {
      ctx.req.session.socket.emit('importer log', data);
    }
    
    start(ctx.body);
  } else {
    ctx.done();
  }
}

var db;

function start(options) {
  db = new Db(options.name, new Server(options.host, options.port));
  db.open(getCollections);
}

function getCollections() {
  log('getting collections');
  db.collections(function(err, collections) {
    collections.forEach(createCollection)
  });
}

function createCollection(col) {
  log('creating collection ' + col);
  if(~col.collectionName.indexOf('.')) {
    console.log('skipping', col.collectionName);
  } else {
    console.log('creating', col.collectionName);
    sh.mkdir('-p', 'resources/' + col.collectionName);
    var config = {
      type: 'Collection',
      typeLabel: 'Collection',
      order: o++,
      properties: {},
      path: '/' + col.collectionName
    };
    
    var stream = col.find().stream();
    var store = process.server.createStore(col.collectionName);
    
    stream.on('data', migrate(config, col, store));
    stream.on('error', stop);
    stream.on('close', end(config));
  }
}

function migrate(config, col, store) {
  return function (obj) {
    Object.keys(obj).forEach(function (key) {
      switch(typeof obj[key]) {
        case 'string':
          proprify(obj[key], key, 'string');
        break;
        case 'object':
          if(Array.isArray(obj[key])) {
            proprify(obj[key], key, 'string');
          } else if(obj[key] instanceof Date) {
            proprify(obj[key], key, 'number');
          } else {
            proprify(obj[key], key, 'object');
          }
        break;
        case 'number':
          proprify(obj[key], key, 'number');
        break;
        case 'boolean':
          proprify(obj[key], key, 'boolean');
        break;
      } 
    });
    
    function proprify(val, key, type) {
      if(key === '_id') {
        return;
      }
      
      config.properties[key] = {
  			type: type,
  			typeLabel: type,
  			id: key,
  			name: key
      };
    }
    
    store.insert(obj, function (err) {});
  }
}

var remaining = 0;
var fs = require('fs');
function end(config) {
  remaining++;
  return function () {
    
    var json = JSON.stringify(config, null, '  ');
    fs.writeFile('resources' + config.path + '/config.json', json, function (err) {
      remaining--;
      if(!remaining) {
        console.log('done');
        if(waiter) waiter();
      }
    });
  }
}

function stop(err) {
  console.log('migration failed...');
  console.error(err);

  if(waiter) waiter(err);
}