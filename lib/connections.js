var Q = require('q');
var jp = require('jsonpath');
var Auth0Api = require('./auth0-api');

function Connections(baseUrl, token, environment) {
    this.auth0Api = new Auth0Api(baseUrl + '/api/v2/connections', token);
    this.environment = environment;
}

Connections.prototype.saveConnections = function saveConnections(fname, token) {
    var that = this;
    return function() {
        return that.auth0Api.getToFile(fname, token);
    }
};

Connections.prototype.deployConnections = function prepareDeployConnections() {
    var that = this;
    var deployConnections = function (data) {
        var deferred = Q.defer();
        if (!data.connections) {
            console.log("No connection data found");
            deferred.resolve(data);
        }
        else {
            that.getExistingConnections()
            .then(function(existingConnections) {
                data.newConnections = [];
                data.connections.forEach(function (connection) {
                    var clonedConnection = cloneConnection(connection);
                    that.deploySingleConnection(clonedConnection, existingConnections)
                        .then(function (newConnection) {
                            data.newConnections.push(newConnection);
                            if (data.newConnections.length === data.connections.length) {
                                deferred.resolve(data)
                            }
                        })
                        .catch(function (error) {
                            deferred.reject(error);
                        });
                });
            })
            .catch(function(error) {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }
    return deployConnections;
};

Connections.prototype.deploySingleConnection = function deploySingleConnection(connection, existingConnections, token) {
    var existingId = findMatchingConnection(connection, existingConnections);
    if (existingId)
    {
        delete connection.name;
        delete connection.strategy;
        return this.auth0Api.patchToAPI(existingId, connection, token);
    }
    else
        return this.auth0Api.postToAPI(connection, token);
};

function findMatchingConnection(connection, existingConnections) {
    var ids = existingConnections ? jp.query(existingConnections, '$[?(@.name ==="' + connection.name + '")].id') : undefined;
    return (ids && ids.length > 0) ? ids[0] : null;
}

function cloneConnection(connection) {
    var clone = JSON.parse(JSON.stringify(connection));
    delete clone.id;
    delete clone.provisioning_ticket_url;
    return clone;
};

Connections.prototype.getExistingConnections = function getExistingConnections(token) { // token is optional
    var deferred = Q.defer(); // will succeed now mater what !
    this.auth0Api.getFromAPI()
        .then(function(data){
            deferred.resolve(data);
        })
        .catch(function(err) {
            deferred.resolve([]);
        });
    return deferred.promise;
};


module.exports = Connections;