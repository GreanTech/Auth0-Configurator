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
        if (!data.connections)
            deferred.reject(new Error('No connection data found'));
        else {
            data.newConnections = [];
            data.connections.forEach(function (connection) {
                var clonedConnection = cloneConnection(connection);
                that.deploySingleConnection(clonedConnection)
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
        }
        return deferred.promise;
    }
    return deployConnections;
};

Connections.prototype.deploySingleConnection = function deploySingleConnection(connection, token) {
    return this.auth0Api.postToAPI(connection, token);
};

function cloneConnection(connection) {
    var clone = JSON.parse(JSON.stringify(connection));
    delete clone.id;
    delete clone.provisioning_ticket_url;
    return clone;
};

Connections.prototype.deleteConnections = function prepareDeleteConnections() {
    var that = this;
    var deleteConnections = function(data) {
        var deferred = Q.defer();
        if (!data.connections)
            deferred.reject(new Error('No connections data found'));
        else {
            that.getExistingConnections()
                .then(function(existCon) {
                    var count = 0;
                    data.connections.forEach(function(connection) {
                        that.deleteSingleConnection(connection, existCon)
                            .then(function() {
                                count++;
                                if (count === data.connections.length) {
                                    deferred.resolve(data)
                                }
                            })
                            .catch(function(error){
                                deferred.reject(error);
                            });
                    });
                })
        }
        return deferred.promise;
    }
    return deleteConnections;
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

Connections.prototype.deleteSingleConnection = function deleteSingleConnection(connection, existingConnections, token) { // token is optional
    var ids = existingConnections ? jp.query(existingConnections, '$[?(@.name ==="' + connection.name + '")].id') : undefined;
    if (ids && ids.length > 0)
        return this.auth0Api.deleteToAPI(ids[0], token);
    else {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise;
    }
};



module.exports = Connections;