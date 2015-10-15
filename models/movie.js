//-----------------------------------------------------------------------------
// Copyright (c) 2015, IBM Corp.
// All rights reserved.
//
// Distributed under the terms of the BSD Simplified License.
//
// The full license is in the LICENSE file, distributed with this software.
//
// You may not use this file except in compliance with the License.
//------------------------------------------------------------------------------

"use strict";

/********************************************
This model file is reponsible for :
	1. get name of a movie
	2. get id of a movie
	3. get list of movies
	4. insert/replace/delete a movie
	5. generate table name against a movie name to store tweets

Author: Noman Yaqub
*********************************************/

var async = require("async"),
    Database = require('./database'),
	Scrapper = require("./scraper"),
	TwitterInsight = require("./twitterInsight");

var db = new Database();

//class definition here
//class constructor
function Movie(name, numbers, count, query) {
	this.name = typeof name !== 'undefined' ? name : null;
	this.boxOfficeNumbers = typeof numbers !== 'undefined' ? numbers : null;
	this.tweetsCount = typeof count !== 'undefined' ? count : 0;

	this.twitterQuery = typeof query !== 'undefined' ? query : null;
}

Movie.prototype = {
	getName: function(id, callback) {
		var query = "SELECT NAME FROM MOVIE WHERE ID=" + id;
		db.executeQuery(query, function(err, result) {
			if (!result.data || result.data.length < 1) callback(null);
			else callback(result.data[0].NAME);
		});
	},
	getGross: function(string) {
		return this.boxOfficeNumbers;
	},
	getTweetsCount: function(string) {
		return this.tweetsCount;
	},
	createMovie: function(callback) {
		var query = "SELECT ID FROM FINAL TABLE (INSERT INTO MOVIE (NAME) VALUES ('"+this.name+"'))";
		db.executeQuery(query, function(err, result) {
			callback(err, result);
		});
	},
	/*
	function to get all existing movies in the system
	*/
	getAll: function(callback) {
		var query = "SELECT ID, NAME FROM MOVIE ORDER BY NAME";
		db.executeQuery(query, function(err, result) {
			if(!err && result.data.length > 0) {
				// convert the data return into json format for easy translation into populating select box in javascript file
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
	/*
	funtion to generate and return the table name for a movie to store tweets
	it filters out the special characers as well as spaces with underscore _
	*/
	getTableName: function(movieTitle) {
        return generateTableName(movieTitle);
    },
    /*
    function to retrieve the data about a movie
    data consists of box office numbers and tweets

    it fetches the data in parrallel threads to make it more efficent
    and stores the box office numbers in session for later use while insert/replace a movie
    */
	loadAll: function(searchStringBoxOffice, searchStringTwitter, callback) {
		var self = this;
		async.parallel({
			theNumbers: function(callback) {
				var scrapper = new Scrapper(searchStringBoxOffice);
				scrapper.fetch(function(err, data) {
					if(!err) {
						self.name = data.name;
						self.boxOfficeNumbers = data.performance;
						// scrapper.print();
					}
					callback(err, data);
				});
		    },
		    twitterInsights: function(callback) {
		    	//default query to Twitter Insight Service is the movie name minus spaces and special characters with a prefix #
		    	var query = toHashtagCase(searchStringBoxOffice);
		    	// if there are additional query paramteres append them with above hashtag
		    	if(searchStringTwitter) query += " " + searchStringTwitter;
		    	self.twitterQuery = query;

		    	console.log('Getting Tweets Count for: ' + self.twitterQuery);
		    	//only tweet count is reuqire here 
		    	var twitterInsight = new TwitterInsight(self.twitterQuery);
				twitterInsight.getCount(function(err, data) {
					// twitterInsight.print();
					if(!err) {
						self.tweetsCount = data.count;
					}
					callback(err, data);
				});
		    }
		}, function(err, results) {
			// in case of err - check which thread went into an error and set the error meesage accordingly
			if(err && results.theNumbers && !results.theNumbers.performance) results.message = results.theNumbers.message;
			else if(err && results.twitterInsights && !results.twitterInsights.data) results.message = results.twitterInsights.message.description;
		    // callback the original routine
		    callback(err, results);
		});
	},
	insert: function(callback) {
		var movieTitle = this.name;
		var self = this;
		//get table name to store the tweets
		var tableName = this.getTableName(movieTitle);
		//create a movie first - enter a new entry into MOVIE table
		this.createMovie(function(err, result) {
			if(!err) {
				var movieID = result.data[0].ID;
				//parallely insert box office numbers and tweets into database
				async.parallel({
					theNumbers: function(callback) {
						// box office numbers has already been fetched when we made a retrieve request
						// we just need to insert the data
						// insert into database here : date and gross
						var boxOfficeNumbersInsertQuery = getBoxOfficeInsertQuery(movieID, self.boxOfficeNumbers);
						db.executeQuery(boxOfficeNumbersInsertQuery, function(err, result) {
							result.data = result.data[0].COUNT;
							callback(err, result);
						});
				    },
				    twitterInsights: function(callback) {
	    					console.log('Getting Tweets for: ' + self.twitterQuery);
				    		// insert into database here: name and tweets
				    		var twitterInsight = new TwitterInsight(self.twitterQuery);
				    		twitterInsight.getCount(function(err, data) {
				    			if(err) callback(err, data);
				    			twitterInsight.insert(movieID, movieTitle, tableName, function(err, data) {
									// twitterInsight.print();
									self.tweetsCount = data.count;
									callback(err, data);
								});
				    		});
				    }
				}, function(err, results) {
					console.log("insert callback")
					// we need movie title and movie uri to update our movie list appearing on homepage
					results.uri = movieID+'/'+movieTitle.replace(/[^a-z\d ]+/gi, "").replace(/ /gi, "-").toLowerCase();
					results.title = movieTitle

					console.log(results)
					// check which thread ran into problem
					// set error message accordingly 
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
	},
	// method to replace and existing movie
	// if a movie already exists it deletes all the data from database and call above insert method
	// if its a new movie request it simply calls insert method
	replace: function(searchStringBoxOffice, searchStringTwitter, callback) {
		// as our application requires retrieval first
		// we had stored the retrieved numbers and movie title into session
		// check if session is still there
		console.log("Movie to replace: " + this.name)
		var movieTitle = this.name;
		var self = this;
		this.delete(movieTitle, function(err, data) {
			if(!err) {
				self.insert(function(err, data) {
					callback(err, data);
				});
			} else {
				data.message="An error occured while deleting the movie"
				callback(err, data)
			}
		});
	},
	// method to delete the movie entries from different table
	// it further calls 
	delete: function(movieName, callback) {
		deleteMovieContent(movieName, function(err, data) {
			if(!err) data.message = "Movie deleted successfully";
			callback(err, data)
		});
	}
}

// method to replace the special characters and spaces from the movie title
// and convert the resulting string into hashtag by capitalzing the first character of each word
// put a # in front of the string
function toHashtagCase(str) {
    str = str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    return '#'+str.replace(/[^a-z\d]/gi, '');
}

// method to insert a new movie entry in database into table MOVIE
// and return the movieID 
function getBoxOfficeInsertQuery(movieID, boxOfficeNumbers) {
	var query = "SELECT COUNT(ID) COUNT FROM FINAL TABLE (INSERT INTO BOX_OFFICE (MOVIE_ID, DATE, GROSS) VALUES "
	for (var i = 0; i < boxOfficeNumbers.length; i++) {
		query += "(" + movieID + ",'" + boxOfficeNumbers[i].date + "'," + boxOfficeNumbers[i].gross + "),"
	};
	return query.slice(0,-1)+")";
}

//method to delete movie entries from different tables
// first it checks whether the movie exist or not
// then it calls another mehtod to delete entr(ies) or empty the table
function deleteMovieContent(movieName, callback) {
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

// mehtod to delete movie entry from different database tables
// important thing here is the order 
// as we have foriegn key constraint between tables
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

//method to generate the table name to store the tweets of a movie
function generateTableName(movieName) {
	return 'TWEETS_' + movieName.replace(/[^a-z\d]+/gi, "_").toUpperCase();
}

module.exports = Movie;