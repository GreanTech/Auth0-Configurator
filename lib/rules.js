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
        if (!data.rules || data.rules.length == 0) {
            console.log('No rule data found');
            deferred.resolve(data);
        }
        else {
            that.getExistingRules()
            .then(function(existingRules) {
                data.rules.forEach(function (rule) {
                    that.deploySingleRule(rule, existingRules)
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
            })
            .catch(function(error) {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }
    return deployRules;
}

Rules.prototype.deploySingleRule = function deploySingleRule(rule, existingRules, token) {
    var existingId = findMatchingRule(rule, existingRules);
    delete rule.id;
    if (existingId) {
        delete rule.stage;
        return this.auth0Api.patchToAPI(existingId, rule, token);
    }
    else {
        return this.auth0Api.postToAPI(rule, token);
    }
};

function findMatchingRule(rule, existingRules) {
    var ids = existingRules ? jp.query(existingRules, '$[?(@.name ==="' + rule.name + '")].id') : undefined;
    return (ids && ids.length > 0) ? ids[0] : null;
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


module.exports = Rules;