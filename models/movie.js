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
				console.log(movieList)
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
		    	var query = toHashtagCase(searchStringBoxOffice);
		    	if(searchStringTwitter) query += " " + searchStringTwitter;
		    	console.log('Getting Tweets Count for: ' + query);
		    	
		    	var twitterInsight = new TwitterInsight(query);
				twitterInsight.count(function(err, data) {
					// twitterInsight.print();
					if(!err) {
						tweetsCount = data.count;
					}
					callback(err, data);
				});
		    }
		}, function(err, results) {
			if(err && results.theNumbers && !results.theNumbers.performance) results.message = results.theNumbers.message;
			else if(err && results.twitterInsights && !results.twitterInsights.data) results.message = results.twitterInsights.message.description;
		    callback(err, results);
		});
	},
	insert: function(movieTitle, searchStringBoxOffice, searchStringTwitter, callback) {
		if(movieTitle) {
			//create a movie first
			var tableName = this.getTableName(movieTitle);
			this.createMovie(function(err, result) {
				if(!err) {
					var movieID = result.data[0].ID;
					async.parallel({
						theNumbers: function(callback) {
							// insert into database here : date and gross
							db.executeQuery(getBoxOfficeInsertQuery(movieID), function(err, result) {
								result.data = result.data[0].COUNT;
								callback(err, result);
							});
					    },
					    twitterInsights: function(callback) {
					    		var query = toHashtagCase(movieTitle);
		    					if(searchStringTwitter) query += " " + searchStringTwitter;
		    					console.log('Getting Tweets for: ' + query);
					    		// insert into database here: name and tweets
					    		var twitterInsight = new TwitterInsight(query);
								twitterInsight.insert(movieID, movieTitle, tableName, function(err, data) {
									// twitterInsight.print();
									tweetsCount = data;
									callback(err, data);
								});
					    }
					}, function(err, results) {
						console.log("insert callback")
						results.uri = movieID+'/'+movieTitle.replace(/[^a-z\d ]+/gi, "").replace(/ /gi, "-").toLowerCase();
						results.title = movieTitle
						console.log(results)
					   	if(err && results.theNumbers && results.theNumbers.err) {
					   		results.message = results.theNumbers.message;
					   	} else if (err && results.twitterInsights) {
							results.message = results.twitterInsights.data.message.description;
						}
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
			var movieTitle = session.theNumbers.name;
			var self = this;
			this.delete(movieTitle, function(err, data) {
				if(!err) {
					self.insert(movieTitle, searchStringBoxOffice, searchStringTwitter, function(err, data) {
						callback(err, data);
					});
				} else {
					data.message="An error occured while deleting the movie"
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

function toHashtagCase(str) {
    str = str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    return '#'+str.replace(/[^a-z\d]/gi, '');
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
	console.log(query)
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
	    deleteMovieDeclineRate: function(callback) {
			var queryDR = "DELETE FROM TWEET_ALERTS WHERE MOVIE_ID="+movieID;
			db.executeQuery(queryDR, function(err, result) {
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