/**********************************

OBSOLETE

Require this model in route service.js if you wish to fetch data from an external server
instead of calling dashDB API. And rename this file to rest.js instead of obsolete---rest.js

***********************************/


var curl = require('curlrequest'),
	xml2js = require('xml2js');

//read config file
var config = require('nconf');
var version = 'api:' + config.get('api:version');
var restAPI = config.get(version + ':restAPI');

var xmlParser = new xml2js.Parser();
var isLogin = false;

module.exports.fetch = function(query, callback) {
	console.log("Call: REST API");
	if (!isLogin) {
		login(function(success) {
			if(success) {
				fetchData(query, function(result){
					callback(result);
				});
			}
		});
	} else {
		fetchData(query, function(result) {
			callback(result);
		});
	}
}

function login(callback) {
	var loginOptions = {
		url: restAPI.hostname + restAPI.login.uri,
		insecure: restAPI.params.insecure,
		"cookie-jar": restAPI.params.cookie,
		data: restAPI.login.data
	};

	curlLogin(loginOptions, function(success) {
		callback(success);
	});
}

function curlLogin (loginOptions, callback) {
	curl.request(loginOptions, function (err, data) {
		if(err == null && data !== '') {
			xmlParser.parseString(data, function (err, result) {
			    if (err == null && result.loginservice.resultcode == "success") {
			    	isLogin = true;
			    	console.log("Login: Success");
			    } else {
			    	console.log("Login: Login Failed");
			    	console.dir(result);
			    }
			});
		} else {
			console.log("Login: Curl Failed");
			console.log(err);
			console.dir(data);
		}
    	callback(isLogin); // this will "return" your value to the original caller
	});
}

function fetchData(query, callback) {
	var dataFetchOptions = {
		url: restAPI.hostname + restAPI.service.uri, 
		insecure: restAPI.params.insecure,
		cookie: restAPI.params.cookie,
		data: {
			RSBufferingType : restAPI.service.RSBufferingType,
			cmd : restAPI.service.cmd,
			dbProfileName : restAPI.service.dbProfileName,
			sql: query
		}
	};

	responseBack(dataFetchOptions, function(result) {
		callback(result);
	});
}

function tryParseJSON (jsonString) {
    try {
        var o = JSON.parse(jsonString);
        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns 'null', and typeof null === "object", 
        // so we must check for that, too.
        if (o && typeof o === "object" && o !== null) {
            return o;
        }
    }
    catch (e) {
    	console.log("Invalid Result Returned!");
    }
    return false;
};

function responseBack (dataFetchOptions, callback) {
	var result = { err : true, message: "curl request failed", data : null};
	curl.request(dataFetchOptions, function (err, data) {
		result.message = "invalid data returned";
		var jsonData = tryParseJSON(data);
		if(err == null && (jsonData != false && jsonData.resultCode === "SUCCESS")) {
			result.err = false;
			result.message = "Success";
			result.data = jsonData.items;
	    }
	    callback(result);
	});
}