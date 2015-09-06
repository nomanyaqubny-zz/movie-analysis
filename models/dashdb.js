var ibmdb = require('ibm_db');

//read config file
var config = require('nconf');
var version = 'api:' + config.get("api:version");

var dashDB;
if (process.env.VCAP_SERVICES) {
    var env = JSON.parse(process.env.VCAP_SERVICES);
    dashDB = env['dashDB'][0].credentials;
} else {
	dashDB = config.get(version + ':dashDB');
}

//create connection string to connect to dashDB
var connString = "DRIVER={DB2};DATABASE=" + dashDB.db 
	+ ";UID=" + dashDB.username 
	+ ";PWD=" + dashDB.password
	+ ";HOSTNAME=" + dashDB.hostname
	+ ";port=" + dashDB.port;

module.exports.fetch = function(query, callback) {
	console.log("Call: dashDB");
	fetchFromDatabase(query, function(result) {
	  	callback(result);
	});
};

function fetchFromDatabase(query, callback) {
	var result = { err : true, message: null, data : null};
	if ( !query ) {
		result.message = "No query to execute";
		callback(result);
	} else {
		ibmdb.open(connString, function(err, conn) {
			if (err) {
				result.message = " connection error occurred " + err.message;
			} else {
				console.log(query)
				conn.query(query, function(err, data) {
					if ( !err ) {
						result.err = false;
						result.message = "success";
						result.data = data;
					} else {
						result.message = "sql error occurred " + err.message;
					}
					callback(result);
				});
			}
		});
	}
}