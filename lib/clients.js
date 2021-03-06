var Q = require('q');
var jp = require('jsonpath');
var Auth0Api = require('./auth0-api');

function Clients(baseUrl, token, environment) {
    this.auth0Api = new Auth0Api(baseUrl + '/api/v2/clients', token);
    this.environment = environment; // only used when deploying a new client
}

Clients.prototype.saveClients = function saveClients(fname, token) { // token is optional
    var that = this;
    return function() {
        return that.auth0Api.getToFile(fname, token);
    }
};

Clients.prototype.deployClients = function prepareDeployClients() {
    var that = this;
    var deployClients = function(data) {
        var deferred = Q.defer();
        data.newClients = [];
        if (!data.clients || data.clients.length == 0) {
            console.log("No client data found");
            deferred.resolve(data);
        }
        else {
            that.getExistingClients()
            .then(function(existingClients) {
                data.clients.forEach(function (client) {
                    var preparedClient = cloneClient(client);
                    that.deploySingleClient(preparedClient, existingClients)
                        .then(function (newClient) {
                            data.newClients.push(newClient);
                            // Now update the clientId of the connection to match the new client
                            for (var i = 0; data.connections && i < data.connections.length; i++) {
                                var ix = data.connections[i].enabled_clients.indexOf(client.client_id);
                                if (ix >= 0) {
                                    data.connections[i].enabled_clients[ix] = newClient.client_id;
                                }
                            }
                            if (data.newClients.length === data.clients.length) {
                                deferred.resolve(data)
                            }
                        })
                        .catch(function (error) {
                            deferred.reject(error);
                        });
                });
            })
            .catch(function(error) {
                deferred.reject((error))
            })
        }
        return deferred.promise;
    }
    return deployClients;
}

Clients.prototype.deploySingleClient = function deploySingleClient(client, existingClients, token) { // existingClients, token are optional
    var existingId = findMatchingClient(client, existingClients);
    delete client.owners;
    if (existingId)
        return this.auth0Api.patchToAPI(existingId, client, token);
    else {
        return this.auth0Api.postToAPI(client, token);
    }
};

function cloneClient(client) {
    var clone = JSON.parse(JSON.stringify(client));
    delete clone.client_id;
    delete clone.global;
    delete clone.tenant;
    delete clone.callback_url_template;
    delete clone.config_route;
    return clone;
}

Clients.prototype.deleteClients = function prepareDeleteClients() {
    var that = this;
    var deleteClients = function(data) {
        var deferred = Q.defer();
        if (!data.clients)
            deferred.reject(new Error('No client data found'));
        else {
            that.getExistingClients()
                .then(function(existCl) {
                    var count = 0;
                    data.clients.forEach(function(client) {
                        that.deleteSingleClient(client, existCl)
                            .then(function() {
                                count++;
                                if (count === data.clients.length) {
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
    return deleteClients;
}

Clients.prototype.getExistingClients = function getExistingClients(token) { // token is optional
    var deferred = Q.defer(); // will succeed now mater what !
    this.auth0Api.getFromAPI()
        .then(function(data){
            deferred.resolve(data);
        })
        .catch(function(err) {
            deferred.resolve([]);
        });
    return deferred.promise;
}

Clients.prototype.deleteSingleClient = function deleteSingleClient(client, existingClients, token) { // token is optional
    var existingId = findMatchingClient(client, existingClients);
    if (existingId)
        return this.auth0Api.deleteToAPI(ids[0], token);
    else {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise;
    }
};

function findMatchingClient(client, existingClients) {
    var ids = existingClients ? jp.query(existingClients, '$[?(@.name ==="' + client.name + '")].client_id') : null;
    return (ids && ids.length > 0) ? ids[0] : null;
}




module.exports = Clients;