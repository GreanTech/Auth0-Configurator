var Q = require('q');
var jp = require('jsonpath');
var Auth0Api = require('./auth0-api');

function Rules(baseUrl, token, environment) {
    this.auth0Api = new Auth0Api(baseUrl + '/api/v2/rules', token);
    this.environment = environment;
}

Rules.prototype.saveRules = function saveRules(fname, token) {
    var that = this;
    return function() {
        return that.auth0Api.getToFile(fname, token);
    }
};

Rules.prototype.deployRules = function deployRules() {
    var that = this;
    var deployRules = function (data) {
        var deferred = Q.defer();
        data.newRules = [];
        if (!data.rules)
            deferred.reject(new Error('No rule data found'));
        else {
            data.rules.forEach(function (rule) {
                that.deploySingleRule(rule)
                    .then(function (newRule) {
                        data.newRules.push(newRule);
                        if (data.newRules.length === data.rules.length) {
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
    return deployRules;
}

Rules.prototype.deploySingleRule = function deploySingleRule(rule, token) {
    if (rule.id) delete rule.id;
    return this.auth0Api.postToAPI(rule, token);
};

Rules.prototype.deleteRules = function deleteRules() {
    var that = this;
    var deleteRules = function(data) {
        var deferred = Q.defer();
        if (!data.rules)
            deferred.reject(new Error('No rule data found'));
        else {
            that.getExistingRules()
                .then(function(existRules) {
                    var count = 0;
                    data.rules.forEach(function(rule) {
                        that.deleteSingleRule(rule, existRules)
                            .then(function() {
                                count++;
                                if (count === data.rules.length) {
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
    return deleteRules;
}

Rules.prototype.getExistingRules = function getExistingRules(token) { // token is optional
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

Rules.prototype.deleteSingleRule = function deleteSingleRule(rule, existingRules, token) { // token is optional
    var ids = existingRules ? jp.query(existingRules, '$[?(@.name ==="' + rule.name + '")].id') : undefined;
    if (ids && ids.length > 0)
        return this.auth0Api.deleteToAPI(ids[0], token);
    else {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise;
    }
};



module.exports = Rules;