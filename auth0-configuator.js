#!/usr/bin/env node

var Clients = require('./lib/clients');
var Connections = require('./lib/connections');
var Rules = require('./lib/rules');
var fileReader = require ('./lib/fileReader');

var program = require('commander');
var path = require('path');


program
    .version('0.0.1')
    .option('-m, --mode <mode>', 'Read or write configuration (read, write)', /^(read|write)$/i)
    .option('-u, --url <url>', 'Auth0 tenant, e.g. https://blabla.auth0.com')
    .option('-t, --token <token>', 'Auth0 token with suffecient permissions for the tenant')
    .option('-d, --dir <directory>', 'Data directory')
//    .option('-e, --env <environment>', 'Environment', /^(test|qa|prod)$/i, 'test')
    .parse(process.argv);

if (!program.mode) {
    console.log( 'Read or write (deploy) Auth0 configuration? Use the -m command line argument with "read" or "write"');
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


if (mode === 'write') {
    fileReader.getFileNames(datadir)
        .then(fileReader.loadDataFiles)
        .then(myClients.deleteClients())
        .then(myClients.deployClients())
        .then(myConnections.deleteConnections())
        .then(myConnections.deployConnections())
        .then(myRules.deleteRules())
        .then(myRules.deployRules())
        //.then(myTemplates.deleteEmailTemplates())
        //.then(myTemplates.deployEmailTemplates())
        //.then(myTemplates.deletePageTemplates())
        //.then(myTemplates.deployPageTemplates())
        .then(function() {
            console.log('Done!');
        })
        .catch(function (error) {
            Console.log(error);
            process.exit(2);
        })
        .finally(function () {
            process.exit(0);
        });
}
else {
    fileReader.newDirectory(datadir)
        .then(myClients.saveClients(path.join(datadir,'clients.json')))
        .then(myConnections.saveConnections(path.join(datadir, 'connections.json')))
        .then(myRules.saveRules(path.join(datadir, 'rules.json')))
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

