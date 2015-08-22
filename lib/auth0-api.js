var request = require('request');
var Q = require('q');
var fs = require('fs');

function Auth0Api(url, token) {
    if (url && url.length > 0 && url[url.length-1] === '/')
        this.url = url.substring(0, url.length-1);
    else
        this.url = url;
    this.token = token;
}

Auth0Api.prototype.getToFile = function getToFile(fname, token) {
    var deferred = Q.defer();
    this.getFromAPI(token)
        .then(function(data) {
            fs.unlink(fname, function () {
                fs.writeFile(fname, JSON.stringify(data), function (err) {
                    if (err)
                        deferred.reject(err);
                    else
                        deferred.resolve();
                });
            });
        })
        .catch(function(error) {
            deferred.reject(error);
        });
    return deferred.promise;
};

Auth0Api.prototype.getFromAPI = function getFromAPI(token) {
    var options = {
        url: this.url,
        headers: {
            'Authorization': 'Bearer ' + (token ? token : this.token)
        }
    };
    var deferred = Q.defer();
    request.get(options, function (err, response, body) {
        if (err)
            deferred.reject(err);
        else if (response.statusCode === 200) {
            deferred.resolve(JSON.parse(body));
        }
        else {
            var error;
            if (response.statusCode === 401)
                error = new Error('Bad token');
            else
                error = new Error('Unexpected error, status code ' + response.statusCode);
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

Auth0Api.prototype.postToAPI = function postToAPI(data, token) {
    var options = {
        url: this.url,
        headers: {
            'Authorization': 'Bearer ' + (token ? token : this.token),
            'content-type': 'application/json'
        },
        json: true,
        body: data
    };
    var deferred = Q.defer();
    var error;

    request.post(options, function (err, response, body) {
        if (err)
            deferred.reject(err);

        if (response.statusCode === 201)
            deferred.resolve(body);
        else {
            if (response.statusCode === 401)
                error = new Error('Bad token');
            else
                error = new Error('Unexpected error, status code ' + response.statusCode);
            deferred.reject(error);
        }
    });
    return deferred.promise;
}

Auth0Api.prototype.deleteToAPI = function deleteToAPI(key, token) {
    var options = {
        url: this.url + '/' + key,
        headers: {
            'Authorization': 'Bearer ' + (token ? token : this.token)
        }
    };
    var deferred = Q.defer();
    request.del(options, function (err, response, body) {
        if (err)
            deferred.reject(err);

        if (response.statusCode === 204)
            deferred.resolve();
        else {
            var error;
            if (response.statusCode === 401)
                error = new Error('Bad token');
            else
                error = new Error('Unexpected error, status code ' + response.statusCode);
            deferred.reject(error);
        }
    });
    return deferred.promise;
}


module.exports = Auth0Api;