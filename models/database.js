"use strict";

var ibmdb = require('ibm_db');
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

var USStatesValues = [];

var createMovieTable = 'CREATE TABLE MOVIE ('
+ 'ID INT NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1, INCREMENT BY 1),'
+ 'NAME VARCHAR(128) NOT NULL,'
+ 'CREATED TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,'
+ 'CONSTRAINT MOVIE_UNIQ UNIQUE (NAME),'
+ 'PRIMARY KEY(ID)'
+ ') ORGANIZE BY ROW;';

var createBoxOfficeTable = 'CREATE TABLE BOX_OFFICE ('
+ 'ID INT NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1, INCREMENT BY 1),'
+ 'MOVIE_ID INT NOT NULL,'
+ 'DATE VARCHAR(128),'
+ 'GROSS INT,'
+ 'CREATED TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,'
+ 'CONSTRAINT FK_MOV_ID FOREIGN KEY(MOVIE_ID) REFERENCES MOVIE(ID),'
+ 'PRIMARY KEY(ID)'
+ ') ORGANIZE BY ROW;';

var createUSSatesTable = 'CREATE TABLE US_STATES ('
+ 'STATE VARCHAR(128),'
+ 'STATE_ISO VARCHAR(128)'
+ ');';

var insertUSStates = "INSERT INTO US_STATES (STATE_ISO, STATE) VALUES "
	+"('AL', 'Alabama'),"
	+"('AK', 'Alaska'),"
	+"('AZ', 'Arizona'),"
	+"('AR', 'Arkansas'),"
	+"('CA', 'California'),"
	+"('CO', 'Colorado'),"
	+"('CT', 'Connecticut'),"
	+"('DE', 'Delaware'),"
	+"('DC', 'District of Columbia'),"
	+"('FL', 'Florida'),"
	+"('GA', 'Georgia'),"
	+"('HI', 'Hawaii'),"
	+"('ID', 'Idaho'),"
	+"('IL', 'Illinois'),"
	+"('IN', 'Indiana'),"
	+"('IA', 'Iowa'),"
	+"('KS', 'Kansa'),"
	+"('KY', 'Kentucky'),"
	+"('LA', 'Lousiana'),"
	+"('ME', 'Maine'),"
	+"('MD', 'Maryland'),"
	+"('MA', 'Massachusetts'),"
	+"('MI', 'Michigan'),"
	+"('MN', 'Minnesota'),"
	+"('MS', 'Mississippi'),"
	+"('MO', 'Missouri'),"
	+"('MT', 'Montana'),"
	+"('NE', 'Nebraska'),"
	+"('NV', 'Nevada'),"
	+"('NH', 'New Hampshire'),"
	+"('NJ', 'New Jersey'),"
	+"('NM', 'New Mexico'),"
	+"('NY', 'New York'),"
	+"('NC', 'North Carolina'),"
	+"('ND', 'North Dakota'),"
	+"('OH', 'Ohio'),"
	+"('OK', 'Oklahoma'),"
	+"('OR', 'Oregon'),"
	+"('PA', 'Pennsylvania'),"
	+"('RI', 'Rhode Island'),"
	+"('SC', 'South Carolina'),"
	+"('SD', 'South Dakota'),"
	+"('TN', 'Tennessee'),"
	+"('TX', 'Texas'),"
	+"('UT', 'Utah'),"
	+"('VT', 'Vermont'),"
	+"('VA', 'Virginia'),"
	+"('WA', 'Washington'),"
	+"('WV', 'West Virginia'),"
	+"('WI', 'Wisconsin'),"
	+"('WY', 'Wyoming');";

var createTweetsAlertTable = 'CREATE TABLE TWEET_ALERTS ('
+ 'MOVIE_ID INT NOT NULL,'
+ 'STATE_ISO VARCHAR(128),'
+ 'DECLINE_RATE DOUBLE,'
+ ') ORGANIZE BY ROW;';

var defaultTables = [
		{name : "MOVIE", statement : createMovieTable}, 
		{name : "US_STATES", statement : createUSSatesTable + insertUSStates}, 
		{name : "BOX_OFFICE", statement : createBoxOfficeTable}, 
		{name : "TWEET_ALERTS", statement : createTweetsAlertTable}
	];

var existingTables;
//class definition here
//class constructor
function Database() {
	existingTables = [];
}

Database.prototype = {
	info: function() {
		console.log(connString);
	},
	executeQuery: function(query, callback) {
		var result = { err : true, message: null, data : null};
		if ( !query ) {
			result.message = "No query to execute";
			callback(true, result);
		} else {
			ibmdb.open(connString, function(err, conn) {
				if (err) {
					result.message = err.message;
					callback(err, result);
				} else {
					// console.log("To execute: " + query);
					conn.query(query, function(err, data) {
						if ( !err ) {
							result.err = false;
							result.message = "success";
							result.data = data;
						} else {
							result.message = "sql error occurred: " + err.message;
						}
						callback(err, result);
					});
				}
			});
		}
	},
	getExistingTables: function(callback) {
		var query = "SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA=CURRENT_SCHEMA ORDER BY TABNAME";
		this.executeQuery(query, function(err, result) {
			if(!err) {
				//cleanup data
				for (var i = 0; i < result.data.length; i++) {
	    			existingTables.push(result.data[i].TABNAME);
				}
	    	}
	    	callback(err, result);
		});
	},
	checkTableExist: function(name, callback) {
		console.log("checkTableExist");
		var query = "SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA=CURRENT_SCHEMA ORDER BY TABNAME";
		var found = false;
		this.executeQuery(query, function(err, result) {
			if(!err) {
				for (var i = 0; i < result.data.length; i++) {
					if(name.toUpperCase() === result.data[i].TABNAME) {
						found = true;
					}
	    			console.log(result.data[i].TABNAME);
				}
			}
			callback(found);
		});
	},
	initialize: function(callback) {
		var self = this;
		this.getExistingTables(function(err, result) {
			if (err) {
				callback(err, result)
			} else {
				var query = '';
				for (var i = 0; i < defaultTables.length; i++) {
					if (existingTables.indexOf(defaultTables[i].name) < 0) {
						query += defaultTables[i].statement;
					}
				}
				if(query) {
					self.executeQuery(query, function(err, result) {
						if(!err) {
							console.log(result.message + " IN DATABASE INITIALIZATION")
						} else {
							console.log(result.message + " IN DATABASE INITIALIZATION")
						}
						callback(err, result);
					});
				} else {
					callback(err, result);
				}
			}
		});
	}
}

module.exports = Database;