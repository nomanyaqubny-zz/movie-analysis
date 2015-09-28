"use strict";

var async = require("async"),
    Database = require('./database'),
	Scrapper = require("./scrapper"),
	TwitterInsight = require("./twitterInsight");

//class variables here
var name, gross, tweetsCount, db;

//class definition here
//class constructor
function Movie() {
	db = new Database();
	name = "American Sniper";
	gross = null;
	tweetsCount = null;
}

Movie.prototype = {
	getName: function(id, callback) {
		var query = "SELECT NAME FROM MOVIE WHERE ID=" + id;
		db.executeQuery(query, function(err, result) {
			if (!result.data) callback(null);
			else callback(result.data[0].NAME);
		});
	},
	getGross: function(string) {
		return gross;
	},
	getTweetsCount: function(string) {
		return tweetsCount;
	},
	createMovie: function(callback) {
		var query = "SELECT ID FROM FINAL TABLE (INSERT INTO MOVIE (NAME) VALUES ('"+name+"'))";
		db.executeQuery(query, function(err, result) {
			callback(err, result);
		});
	},
	getAll: function(callback) {
		var query = "SELECT ID, NAME FROM MOVIE ORDER BY NAME";
		db.executeQuery(query, function(err, result) {
			if(!err && result.data.length > 0) {
				var movieList = '{';
				for (var i = 0; i < result.data.length; i++) {
					var index = result.data[i].ID+'/'+result.data[i].NAME.replace(/[^a-z\d ]+/gi, "").replace(/ /gi, "-").toLowerCase();
					movieList += '"' + index + '":"' + result.data[i].NAME + '",';
				}
				movieList = movieList.slice(0,-1);
				movieList += '}';
				result = { err : result.err, message: "success", data : JSON.parse(movieList)};
			}
			callback(result);
		});
	},
	getTableName: function(movieName) {
        return generateTableName(movieName);
    },
	loadAll: function(searchStringBoxOffice, searchStringTwitter, callback) {
		async.parallel({
			theNumbers: function(callback) {
				var scrapper = new Scrapper(searchStringBoxOffice);
				scrapper.fetch(function(err, data) {
					if(!err) {
						name = data.name;
						gross = data.performance;
						// scrapper.print();
					}
					callback(err, data);
				});
		    },
		    twitterInsights: function(callback) {
		    	console.log('Getting Tweets Count for: ' + searchStringTwitter);
		    	var twitterInsight = new TwitterInsight(searchStringTwitter);
				twitterInsight.count(function(err, data) {
					// twitterInsight.print();
					if(!err) {
						tweetsCount = data.count;
					}
					callback(err, data);
				});
		    }
		}, function(err, results) {
			console.log(results)
			if(err && !results.theNumbers.performance) results.message = results.theNumbers.message;
			else if(err && !results.twitterInsights.data) results.message = results.twitterInsights.message.description;
		    callback(err, results);
		});
	},
	insert: function(session, searchStringBoxOffice, searchStringTwitter, callback) {
		if(session && session.theNumbers) {
			console.log("Movie to insert: " + session.theNumbers.name)
			//create a movie first
			var tableName = this.getTableName(name);
			this.createMovie(function(err, result) {
				if(!err) {
					async.parallel({
						theNumbers: function(callback) {
							// insert into database here : date and gross
							db.executeQuery(getBoxOfficeInsertQuery(result.data[0].ID), function(err, result) {
								callback(err, result.data[0].COUNT);
							});
					    },
					    tweets: function(callback) {
					    		// insert into database here: name and tweets
					    		var twitterInsight = new TwitterInsight(searchStringTwitter);
								twitterInsight.insert(name, tableName, function(err, data) {
									// twitterInsight.print();
									tweetsCount = data.entries;
									callback(err, data);
								});
					    }
					}, function(err, results) {
					    // results is now equals to: {one: 'abc\n', two: 'xyz\n'}
					    console.log("Movie.js: asnyc result")
					    console.log(results);
					   	if(err && !results.theNumbers.performance) results.message = results.theNumbers.message;
						else if(err && !results.twitterInsights.data) results.message = results.twitterInsights.message.description;
					    callback(err, results);
					});
				} else {
					callback(err, {message:"Movie Already Exist"});
				}
			});
		} else {
			callback(true, {message:"Retrieve Movie Data First"});
		}
	},
	replace: function(session, searchStringBoxOffice, searchStringTwitter, callback) {
		if(session && session.theNumbers) {
			console.log("Movie to replace: " + session.theNumbers.name)
			var self = this;
			this.delete(name, function(err, data) {
				if(!err) {
					self.insert(session, searchStringBoxOffice, searchStringTwitter, function(err, data) {
						callback(err, data);
					});
				} else {
					data.message="An error occured"
					callback(err, data)
				}
			});
		} else {
			callback(true, {message:"Retrieve Movie Data First"});
		}
	},
	delete: function(movieName, callback) {
		deleteMovieContent(movieName, function(err, data) {
			if(!err) data.message = "Movie deleted successfully";
			callback(err, data)
		});
	}
}

function getBoxOfficeInsertQuery(movieID) {
	var query = "SELECT COUNT(ID) COUNT FROM FINAL TABLE (INSERT INTO BOX_OFFICE (MOVIE_ID, DATE, GROSS) VALUES "
	for (var i = 0; i < gross.length; i++) {
		query += "(" + movieID + ",'" + gross[i].date + "'," + gross[i].gross + "),"
	};
	return query.slice(0,-1)+")";
}

function deleteMovieContent(movieName, callback) {
	if(movieName === null) movieName = name;
	var query = "SELECT ID FROM MOVIE WHERE NAME='"+movieName+"'";
	var tableName = generateTableName(movieName);
	db.executeQuery(query, function(err, result) {
		if(!err) {
			if(result.data.length > 0) {
				var id = result.data[0].ID;
				deleteAll(id, tableName, function(err, result){
					console.log("deleteMovieContent 1:" + JSON.stringify(result))
					callback(err, result);
				});
			} else {
				console.log("deleteMovieContent 3: No such movie exist")
				callback(false, {message:"Delete: No such movie Exist"});
			}
		} else {
			console.log("deleteMovieContent 2:" + JSON.stringify(result))
			result.message = "Movie does not exist.";
			callback(result.err, result);
		}
	});
}

function deleteAll(movieID, tableName, callback) {
	async.series({
		deleteMovieTweets: function(callback) {
			var queryMT = "DROP TABLE "+ tableName
			db.executeQuery(queryMT, function(err, result) {
				callback(false, result);
			});
	    },
		deleteMovieBoxOfficeContent: function(callback) {
			var queryBO = "DELETE FROM BOX_OFFICE WHERE MOVIE_ID="+movieID;
			db.executeQuery(queryBO, function(err, result) {
				callback(err, result);
			});
	    },
	    deleteMovieDefinition: function(callback) {
	    	var queryMD = "DELETE FROM MOVIE WHERE ID="+movieID;
			db.executeQuery(queryMD, function(err, result) {
				callback(err, result);
			});
	    },
	}, function(err, results) {
	    callback(err, results);
	});
}

function generateTableName(movieName) {
	return 'TWEETS_' + movieName.replace(/[^a-z\d]+/gi, "_").toUpperCase();
}

module.exports = Movie;