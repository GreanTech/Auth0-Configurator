#!/usr/bin/env node

var Clients = require('./lib/clients');
var Connections = require('./lib/connections');
var Rules = require('./lib/rules');
var fileReader = require ('./lib/fileReader');
var moment = require('moment');

var program = require('commander');
var path = require('path');


program
    .version('0.0.1')
    .option('-m, --mode <mode>', 'Read or write configuration (save, update)', /^(save|update)$/i)
    .option('-u, --url <url>', 'Auth0 tenant, e.g. https://blabla.auth0.com')
    .option('-t, --token <token>', 'Auth0 token with suffecient permissions for the tenant')
    .option('-d, --dir <directory>', 'Data directory')
    //    .option('-e, --env <environment>', 'Environment', /^(test|qa|prod)$/i, 'test')
    .parse(process.argv);

if (!program.mode) {
    console.log( 'Save or update (deploy) Auth0 configuration? Use the -m command line argument with "save" or "update"');
    process.exit(1);
}
if (!program.url) {
    console.log( 'URL of Auth0 tenant must be specified. Use the -u command line argument');
    process.exit(1);
}
if (!program.token) {
    console.log( 'An encoded Auth0 access token must be specified. Use the -t command line argument');
    process.exit(1);
}
if (!program.dir) {
    console.log( 'The directory of the data files must be specified. Use the -d command line argument');
    process.exit(1);
}
//if (!program.environment) {
//    console.log( 'Deployment environment not specified. Using default \'test\'. Use the -e command line argument ');
//}

var mode = program.mode.toLowerCase();
var url = program.url;
var token = program.token;
var datadir = program.dir;
var environment = program.environment ? program.environment : 'test';

var myClients = new Clients(url, token, environment);
var myConnections = new Connections(url, token, environment);
var myRules = new Rules(url, token, environment);
var doneClients = false;
var doneConnections = false;
var doneRules = false;


if (mode === 'update') {
    var backupDir = path.join(datadir, moment().format('YYYY-MM-DD-HH-mm-ss'));
    fileReader.newDirectory(backupDir)
        .then(myClients.saveClients(path.join(backupDir,'clients.json')))
        .then(myConnections.saveConnections(path.join(backupDir, 'connections.json')))
        .then(myRules.saveRules(path.join(backupDir, 'rules.json')))
        .then(fileReader.getFileNames(datadir))
        .then(fileReader.loadDataFiles)
        .then(myClients.deployClients())
        .then(myConnections.deployConnections())
        .then(myRules.deployRules())
        //.then(myTemplates.deleteEmailTemplates())
        //.then(myTemplates.deployEmailTemplates())
        //.then(myTemplates.deletePageTemplates())
        //.then(myTemplates.deployPageTemplates())
        .then(function() {
            console.log('Done!');
        })
        .catch(function (error) {
            console.log(error);
            process.exit(2);
        })
        .finally(function () {
            process.exit(0);
        });
}
else {
    var saveDir = path.join(datadir, moment().format('YYYY-MM-DD-HH-mm-ss'));
    fileReader.newDirectory(saveDir)
        .then(myClients.saveClients(path.join(saveDir,'clients.json')))
        .then(myConnections.saveConnections(path.join(saveDir, 'connections.json')))
        .then(myRules.saveRules(path.join(saveDir, 'rules.json')))
        //.then(myTemplates.saveEmailTemplates())
        //.then(myTemplates.savePageTemplates())
        .then(function() {
            console.log('Done!');
        })
        .catch(function(error) {
            console.log(error);
        })
        .finally(function() {
            process.exit();
        });
}

