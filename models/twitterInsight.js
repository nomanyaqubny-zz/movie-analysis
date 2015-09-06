"use strict"

var async = require('async'),
    request = require('request'),
    Database = require('./database');

var query, 
    count, 
    tweets, 
    MAX_TWEETS, 
    insightHOST, 
    schemaTweetMap,
    progress;

function TwitterInsight(searchString) {
    query = searchString;
    MAX_TWEETS = 500;
    progress = 0;
    populateSchemaTweetMap();
    getColumns();

    var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
    insightHOST = services["twitterinsights"]
    ? services["twitterinsights"][0].credentials.url
    : "https://cdeservice.mybluemix.net:443";
}

TwitterInsight.prototype = {
	count: function(callback) {
        var url = insightHOST + '/api/v1/messages/count';
        retrieveInsight(url, query, function(err, data){
            if(err)
                throw err;
            count = data['search']['results'];
            callback(err, count);
        });
    },
    fetch: function(callback) {
        var url = insightHOST + '/api/v1/messages/search?q=' + query + '&size=' + MAX_TWEETS;
        console.log(url);
        async.timesSeries(3, function(n, next) {
            retrieveInsight(url, function(err, data) {
                url = data['related']['next']['href'];
                // count = data['search']['results'];
                // tweets.push(data['tweets']);
                //TODO: insert into database here
                next(err, data);
            });
        }, function(err, data){
            callback(err, count);
        });
	},
    insert: function(movieName, tableName, callback) {
        //check if there is already an ajax running
        if(progress == 0) {
            var url = insightHOST + '/api/v1/messages/search?q=' + query + '&size=' + MAX_TWEETS;
            //create a table with the movie name to store tweets
            var db = new Database();
            createMovieTweetsTable(db, tableName, function(err, data) {
                if(!err) {
                    //retrieve the tweets and insert into table
                    //Twitter for Insight provides at max 500 tweets per request
                    //call the retrieve and insert function total number of tweets / max tweets per request
                    var times =  Math.ceil(count / MAX_TWEETS);
                    // for (var i = 0; i < 200; i++) {
                    //     var url = insightHOST + '/api/v1/messages/search?q=' + movieName + '&from=' + (i*MAX_TWEETS) + '&size=' + MAX_TWEETS;
                    //     retrieveInsight(url, function(err, data) {
                    //         //insert into database here
                    //         if (!err && data['tweets'].length>0) {
                    //             insertTweets(db, movieName, data['tweets'], function(err, message, rows) {
                    //                 if(!err) {
                    //                     progress += rows;
                    //                     process.stdout.write("\rso far: " + progress);
                    //                     if(progress>=100000) {
                    //                         console.log("done")
                    //                         callback(err, progress);
                    //                     }
                    //                 } else {
                    //                     console.log(err)
                    //                     // callback(err, progress)
                    //                 }
                    //             });
                    //         } else {
                    //             console.log(err)
                    //             console.log(data['tweets'])
                    //             callback(err, progress)
                    //         }
                    //     });
                    // }

                    
                    async.times(times, function(n, next) {
                        retrieveInsight(url, query, function(err, data) {
                            if (!err && data['tweets'].length > 0) {
                                // url = data['related']['next']['href'];
                                insertTweets(db, tableName, data['tweets'], function(err, message, rows) {
                                    if(!err) {
                                        progress += rows;
                                        process.stdout.write("\rso far: " + progress);
                                    }
                                    next(err, data);
                                });
                            } else {
                                console.log(err)
                                callback(err, progress)
                            }
                        }, n*MAX_TWEETS);
                    }, function(err, data) {
                        console.log(err)
                        return callback(err, progress);
                    });

                } else {
                    callback(err, progress);
                }
            });
        }
    },
    getCount: function() {
        return count;
    },
    getTweets: function() {
        return tweets;
    },
    print: function() {
        console.log("No. of Tweets found: " + count);
        console.log(tweets)
    }
}

function retrieveInsight(url, query, callback, from) {
    var params = null;
    if(query) {
        params = {
            q: query,
            size: MAX_TWEETS,
            from: from?from:0
        }
    }
    request({
        method: "GET",
        url: url,
        qs: params,
        auth: {
            'user': 'f6204541d9434de8a1363a9214fe5455',
            'pass': 'oUzn5yaGuq'
        }
    }, function(err, response, data) {
        if (err) {
            callback(err);
        } else {
            if (response.statusCode == 200) {
                try {
                    callback(null, JSON.parse(data));
                } catch(e) {
                    callback({ 
                        error: { 
                            description: e.message
                        },
                        status_code: response.statusCode
                    });
                }
            } else {
                callback({ 
                    error: {
                        description: data 
                    },
                    status_code: response.statusCode
                });
            }
        }
    });
}

function createMovieTweetsTable (db, tableName, callback) {
    var createTableQuery = 'CREATE TABLE '
        + tableName
        + '(GENERATORDISPLAYNAME VARCHAR(1024),'
        + 'ID INT NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1, INCREMENT BY 1),'
        + 'MSGBODY VARCHAR(2048),'
        + 'MSGHASHTAGS VARCHAR(2048),'
        + 'MSGID VARCHAR(128),'
        + 'MSGPOSTEDTIME TIMESTAMP,'
        + 'MSGTYPE VARCHAR(128),'
        + 'MSGSENTIMENT VARCHAR(128) NOT NULL WITH DEFAULT \'NEUTRAL\','
        + 'SMAAUTHORCITY VARCHAR(1024),'
        + 'SMAAUTHORCOUNTRY VARCHAR(1024),'
        + 'SMAAUTHORGENDER VARCHAR(1024),'
        + 'SMAAUTHORSTATE VARCHAR(1024),'
        + 'USERDISPLAYNAME VARCHAR(1024),'
        + 'USERFOLLOWERSCOUNT INT,'
        + 'USERFRIENDSCOUNT INT,'
        + 'USERID VARCHAR(128),'
        + 'USERLANGUAGE VARCHAR(128),'
        + 'USERLINK VARCHAR(1024),'
        + 'USERLISTEDCOUNT INT,'
        + 'USERLOCATION VARCHAR(1024),'
        + 'USERPREFERREDUSERNAME VARCHAR(1024),'
        + 'USERSTATUSESCOUNT INT,'
        + 'USERUTCOFFSET VARCHAR(1024),'
        + 'USERVERIFIED VARCHAR(1024),'
        + 'PRIMARY KEY(ID)'
        + ') ORGANIZE BY ROW';

    db.checkTableExist(tableName, function(found) {
        // db.executeQuery(dropFirst, function(result) {
        // console.log(result);
        if(!found) {
            db.executeQuery(createTableQuery, function(err, result) {
                if(err) console.log("Error in creating tweet table for the movie");
                callback(err, {message:"New table "+ tableName +" created"});
            });
        } else {
            //TODO: dro table if exist logic ot beimpl
            console.log("Table exists already");
            callback(false, {message:"Table exists already."});
        }
    // });
    });
}

function insertTweets(db, tableName, tweets, callback) {
    var database = new Database();
    try {
        var insertQuery = "INSERT INTO " + tableName + " (" + getColumns() + ") VALUES ";
        for (var i = 0; i < tweets.length; i++) {
            insertQuery += "("+ getColumnsValues(tweets[i]) + "),";
        }
        insertQuery = insertQuery.slice(0,-1);

        database.executeQuery(insertQuery, function(err, result) {
            if(!err) {
                console.log("db insert: success")
                callback(err, result.message + " IN TWEETS INSERTION.", i);
            } else {
                console.log(insertQuery)
                console.log(result)
                console.log("db insert: failure")
                result.message = result.message + " IN TWEETS INSERTION.";
                callback(err, result, i);
            }
            database = null;
        });
    } catch(e) {
        console.log(e)
        callback(true, e)
    }
}

function populateSchemaTweetMap() {
    schemaTweetMap = {
        'GENERATORDISPLAYNAME':{
            'type':'VARCHAR',
            'mapping':'message.generator.displayName'
        },
        'MSGBODY':{
            'type':'VARCHAR',
            'mapping':'message.body'
        },
        'MSGHASHTAGS':{
            'type':'VARCHAR',
            'mapping':'message.twitter_entities.hashtags'
        },
        'MSGID':{
            'type':'VARCHAR',
            'mapping':'message.id'
        },
        'MSGPOSTEDTIME':{
            'type':'TIMESTAMP',
            'mapping':'message.postedTime'
        },
        'MSGTYPE':{
            'type':'VARCHAR',
            'mapping':'message.verb'
        },
        'MSGSENTIMENT':{
            'type':'VARCHAR',
            'mapping':'cde.content.sentiment.polarity',
            'default':'NEUTRAL'
        },
        'SMAAUTHORCITY':{
            'type':'VARCHAR',
            'mapping':'cde.author.location.city'
        },
        'SMAAUTHORCOUNTRY':{
            'type':'VARCHAR',
            'mapping':'cde.author.location.country'
        },
        'SMAAUTHORGENDER':{
            'type':'VARCHAR',
            'mapping':'cde.author.gender'
        },
        'SMAAUTHORSTATE':{
            'type':'VARCHAR',
            'mapping':'cde.author.location.state'
        },
        'USERDISPLAYNAME':{
            'type':'VARCHAR',
            'mapping':'message.actor.displayName'
        },
        'USERFOLLOWERSCOUNT':{
            'type':'INT',
            'mapping':'message.actor.followersCount'
        },
        'USERFRIENDSCOUNT':{
            'type':'INT',
            'mapping':'message.actor.friendsCount'
        },
        'USERID':{
            'type':'VARCHAR',
            'mapping':'message.actor.id'
        },
        'USERLANGUAGE':{
            'type':'VARCHAR',
            'mapping':'message.actor.languages'
        },
        'USERLINK':{
            'type':'VARCHAR',
            'mapping':'message.actor.links.href'
        },
        'USERLISTEDCOUNT':{
            'type':'INT',
            'mapping':'message.actor.listedCount'
        },
        'USERLOCATION':{
            'type':'VARCHAR',
            'mapping':'message.actor.location.displayName'
        },
        'USERPREFERREDUSERNAME':{
            'type':'VARCHAR',
            'mapping':'message.actor.preferredUsername'
        },
        'USERSTATUSESCOUNT':{
            'type':'INT',
            'mapping':'message.actor.statusesCount'
        },
        'USERUTCOFFSET':{
            'type':'VARCHAR',
            'mapping':'message.actor.utcOffset'
        },
        'USERVERIFIED':{
            'type':'VARCHAR',
            'mapping':'message.actor.verified'
        }
    }
}

function getColumns() {
    var keys = '';
    for(var key in schemaTweetMap) {
        keys += key + ',';
    }
    return keys.slice(0,-1);
}

function getColumnsValues(tweet) {
    var index, value = '', values = '';
    for(var key in schemaTweetMap) {
        index = schemaTweetMap[key].mapping;
        value = getObjectValue(tweet, index);
        if (!value) {
            value = (schemaTweetMap[key].default)? "'"+schemaTweetMap[key].default+"'" : null;
        } else if (schemaTweetMap[key].type === "VARCHAR") {
            value = "'" + value.replace(/\'/g,"''") + "'";
        } else if (schemaTweetMap[key].type === "INT") {
            value = parseInt(value) ;
        } else if (schemaTweetMap[key].type === "TIMESTAMP") {
            value = "'" + value.substring(0,10) + " " + value.substring(11,19) + "'";
        }
        values += value + ", ";
    }
    return values.slice(0,-2);
}

function getObjectValue(tweet, stringMultipleIndexes) {
    var index = stringMultipleIndexes.split('.');
    var value = tweet;
    for(var i = 0; i < index.length; i++) {

        if (value[index[i]] != null && value[index[i]] != undefined) {
            value = value[index[i]];
        } else {
            return null;
        }
    }
    return String(value);
}

module.exports = TwitterInsight;