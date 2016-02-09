/**
 * Created by nfj on 28/06/15.
 */
var Q = require('q');
var fs = require('fs');
var path = require('path');


//
// Simply looks for and returns the paths to the first 3 files matching the expected names
//
module.exports.getFileNames = function getFileNames(directory) {
    var that = this;
    var curriedGetFileNames = function() {
        var deferred = Q.defer();
        fs.readdir(directory, function (err, files) {
            if (err) {
                deferred.reject(err);
            }
            else {
                var fileNames = {};
                for (var i = 0; i < files.length; i++) {
                    var fn = files[i];
                    if (fn.indexOf('clients') >= 0 && !fileNames.clientsFile)
                        fileNames.clientsFile = path.join(directory, fn);
                    else if (fn.indexOf('connections') >= 0 && !fileNames.connectionsFile)
                        fileNames.connectionsFile = path.join(directory, fn);
                    else if (fn.indexOf('rules') >= 0 && !fileNames.rulesFile)
                        fileNames.rulesFile = path.join(directory, fn);
                }
                if (fileNames.clientsFile && fileNames.connectionsFile && fileNames.rulesFile)
                    deferred.resolve(fileNames);
                else
                    deferred.reject(new Error("Not all files found (clients, connections, rules)", filenames));
            }
        });
        return deferred.promise;
    }
    return curriedGetFileNames;
}

module.exports.newDirectory = function newDirectory(directory) {
    var deferred = Q.defer();
    fs.mkdir(directory, function (err) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve();
        }
    });
    return deferred.promise;
}

module.exports.loadDataFiles = function(fileNames) {
    var deferred = Q.defer();

    var data = {
        clients: undefined,
        connections: undefined,
        rules: undefined
    };
    loadClients(fileNames.clientsFile, data)
        .then(loadConnections(fileNames.connectionsFile))
        .then(loadRules(fileNames.rulesFile))
        .then(function(data) {
            deferred.resolve(data);
        })
        .catch(function(error) {
            deferred.reject(error)
        });
    
    return deferred.promise;
}

function loadClients(fileName, data) {
    var deferred = Q.defer();
    fs.readFile(fileName, 'utf8', function (err, readData) {
        if (err)
            deferred.reject(err)
        else {
            data.clients = JSON.parse(readData);
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}

function loadConnections(fileName) {
    var fn = fileName;
    var loadConnections = function(data) {
        var deferred = Q.defer();
        fs.readFile(fn, 'utf8', function (err, readData) {
            if (err)
                deferred.reject(err)
            else {
                data.connections = JSON.parse(readData);
                deferred.resolve(data);
            }
        });
        return deferred.promise;
    };
    return loadConnections;
}

function loadRules(fileName) {
    var fn = fileName;
    var loadRules = function(data) {
        var deferred = Q.defer();
        fs.readFile(fn, 'utf8', function (err, readData) {
            if (err)
                deferred.reject(err)
            else {
                data.rules = JSON.parse(readData);
                deferred.resolve(data);
            }
        });
        return deferred.promise;
    };
    return loadRules;
}

//var newClients = [];
//for (var ix = 0; i < clients.length; i++) {
//    var cl = clients[ix];
//    clients.createClient(cl)
//        .then(function (newCl) {
//            newClients.push(newCl);
//            if (ix === clients.length - 1)
//                deferred.resolve(newClients);
//        })
//        .catch(function (error) {
//            deferred.reject(error);
//        });
//    ;
//}
