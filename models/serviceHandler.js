"use strict";

/********************************************
This model file is responsible to handle request made by route service.js

Here we 
	1. define queries against different service names
	2. execute query
	3. return back the result

requires:
	1. model database.js

Author: Noman Yaqub
*********************************************/

var Database = require('./database');

var db = null;

// constructor of the class
function ServiceHandler() {
	db = new Database();
}

// make Service handler an object and define method below
ServiceHandler.prototype = {
	// class method to fetch the data from database against incoming service name
    fetch: function(serviceName, tableName, movieId, start, end, extra, callback) {
    	var query = selectQueryByServiceName(serviceName, tableName, movieId, start, end, extra);
    	db.executeQuery(query, function(err, result) {
    		callback(err, result);
    	});
	}
}

// method to define the queries against service name
// required parameters are service name, tableName and movieId
// optional paramaters are start and end date and extra
function selectQueryByServiceName(serviceName, tableName, movieId, start, end, extra) {
	var query = null;
	switch(serviceName) {
		case "tweetsperstate":
			// query = "SELECT a.SMAAUTHORSTATE AS STATECODE, b.STATE as STATENAME, 10*COUNT(a.MSGID) AS COUNT FROM TWEETS a INNER JOIN USSTATES b ON a.SMAAUTHORSTATE=b.STATEISO WHERE DATE(a.MSGPOSTEDTIME) BETWEEN '" + start + "' AND  '" + end + "' GROUP BY a.SMAAUTHORSTATE, b.STATE";
			query = "SELECT a.SMAAUTHORSTATE AS STATENAME, b.STATE_ISO as STATECODE, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE DATE(a.MSGPOSTEDTIME) BETWEEN '" + start + "' AND  '" + end + "' GROUP BY a.SMAAUTHORSTATE, b.STATE_ISO";
			break;
		case "boxofvstweets":
			// query = "SELECT tweets.DATE, BOXOFFICE/1000, TWEETS.CNT TWEETS FROM AMERICAN_SNIPER_BOXOFFICE box, (SELECT DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM TWEETS WHERE DATE(MSGPOSTEDTIME) BETWEEN '" + start + "' AND  '" + end + "' GROUP BY DATE(MSGPOSTEDTIME))as tweets WHERE box.DATE=tweets.DATE ORDER BY DATE";
			query = "SELECT tweets.DATE, box.GROSS/1000 GROSS, 50*TWEETS.CNT TWEETS FROM BOX_OFFICE box, (SELECT DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM "+tableName+" WHERE DATE(MSGPOSTEDTIME) BETWEEN '" + start + "' AND  '" + end + "' GROUP BY DATE(MSGPOSTEDTIME))as tweets WHERE box.MOVIE_ID= "+movieId+" AND box.DATE=tweets.DATE ORDER BY DATE";
			break;
		case "tweetsdeclinerate":
			// query = "SELECT SMAAUTHORSTATE AS STATE, DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM TWEETS_AMERICAN_SNIPER WHERE DATE(MSGPOSTEDTIME)>'2015-01-15' GROUP BY SMAAUTHORSTATE,DATE(MSGPOSTEDTIME) ORDER BY DATE";
			query = "SELECT b.STATE_ISO AS STATECODE, b.STATE AS STATENAME, a.DECLINE_RATE AS DECLINERATE FROM TWEET_ALERTS a INNER JOIN US_STATES b ON a.STATE_ISO=b.STATE WHERE a.MOVIE_ID="+movieId;
			break;
		case "topcity":
			query = "SELECT a.SMAAUTHORCITY AS CITYNAME, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE a.SMAAUTHORCITY IS NOT NULL GROUP BY a.SMAAUTHORCITY, a.SMAAUTHORSTATE, b.STATE_ISO ORDER BY COUNT DESC FETCH FIRST ROW ONLY";
			break;
		case "topstate":
			query = "SELECT a.SMAAUTHORSTATE AS STATENAME, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE GROUP BY a.SMAAUTHORSTATE, b.STATE_ISO ORDER BY COUNT DESC FETCH FIRST ROW ONLY";
			break;
		case "topday":
			query = "SELECT DATE(a.MSGPOSTEDTIME) AS DAY, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE GROUP BY DATE(a.MSGPOSTEDTIME) ORDER BY COUNT DESC FETCH FIRST ROW ONLY";
			break;
		case "topmonth":
			query = "SELECT DATE(a.MSGPOSTEDTIME) AS DATE, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE GROUP BY DATE(a.MSGPOSTEDTIME) ORDER BY COUNT DESC FETCH FIRST ROW ONLY";
			break;
		case "topthreelanguages":
			query = "SELECT a.USERLANGUAGE AS LABEL, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE GROUP BY a.USERLANGUAGE ORDER BY COUNT DESC FETCH FIRST 3 ROWS ONLY";
			break;
		case "tweetcountpergender":
			query = "SELECT a.SMAAUTHORGENDER AS GENDER, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a WHERE a.SMAAUTHORGENDER IS NOT NULL AND a.SMAAUTHORGENDER!='unknown' GROUP BY a.SMAAUTHORGENDER ORDER BY COUNT";
			break;
		case "tweetspermonth":
			query = "SELECT SUBSTR(CHAR(DATE(MSGPOSTEDTIME),ISO),1,7) AS DATE, SUM(case when MSGSENTIMENT='POSITIVE' then 2 else 0 end) as POSITIVE, sum(case when MSGSENTIMENT='NEGATIVE' then 4 else 0 end) as NEGATIVE, sum(case when MSGSENTIMENT='AMBIVALENT' then 2 else 0 end) as AMBIVALENT, sum(case when MSGSENTIMENT='NEUTRAL' then 1 else 0 end) as NEUTRAL FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE YEAR(MSGPOSTEDTIME)=2015 GROUP BY SUBSTR(CHAR(DATE(MSGPOSTEDTIME),ISO),1,7)";
			break;
		case "tweetsperday":
			query = "SELECT DATE(MSGPOSTEDTIME) AS DATE, SUM(case when MSGSENTIMENT='POSITIVE' then 3 else 0 end) as POSITIVE, sum(case when MSGSENTIMENT='NEGATIVE' then 4 else 0 end) as NEGATIVE, sum(case when MSGSENTIMENT='AMBIVALENT' then 2 else 0 end) as AMBIVALENT, sum(case when MSGSENTIMENT='NEUTRAL' then 1 else 0 end) as NEUTRAL FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE MONTH(MSGPOSTEDTIME)= "+start+" AND YEAR(MSGPOSTEDTIME)= "+end+"  GROUP BY DATE(MSGPOSTEDTIME)";
			break;
		case "topsentiment":
			query = "SELECT MSGSENTIMENT AS SENTIMENT, 10*COUNT(MSGID) AS COUNT FROM "+tableName+" INNER JOIN US_STATES ON SMAAUTHORSTATE=STATE GROUP BY MSGSENTIMENT ORDER BY COUNT DESC FETCH FIRST ROW ONLY";
			break;
		case "tweetscountpersentiment":
			query = "SELECT MSGSENTIMENT AS LABEL, 10*COUNT(MSGID) AS COUNT FROM "+tableName+" INNER JOIN US_STATES ON SMAAUTHORSTATE=STATE GROUP BY MSGSENTIMENT ORDER BY MSGSENTIMENT";
			break;
		case "tweetscountpersentimentandlanguage":
			query = "SELECT USERLANGUAGE AS LANGUAGE, SUM(case when MSGSENTIMENT='POSITIVE' then 3 else 0 end) as POSITIVE, sum(case when MSGSENTIMENT='NEGATIVE' then 4 else 0 end) as NEGATIVE, sum(case when MSGSENTIMENT='AMBIVALENT' then 2 else 0 end) as AMBIVALENT, sum(case when MSGSENTIMENT='NEUTRAL' then 1 else 0 end) as NEUTRAL FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE USERLANGUAGE IN ('en','es','de') GROUP BY USERLANGUAGE";
			break;
		case "sentimentsandcountovertime":
			query = "SELECT DATE(MSGPOSTEDTIME) AS DATE, SUM(case when MSGSENTIMENT='POSITIVE' then 10 else 0 end) as POSITIVE, sum(case when MSGSENTIMENT='NEGATIVE' then 15 else 0 end) as NEGATIVE, sum(case when MSGSENTIMENT='AMBIVALENT' then 12 else 0 end) as AMBIVALENT, sum(case when MSGSENTIMENT='NEUTRAL' then 1 else 0 end) as NEUTRAL FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE b.STATE_ISO= '"+extra+"' AND MONTH(MSGPOSTEDTIME)= "+start+" AND YEAR(MSGPOSTEDTIME)= "+end+" GROUP BY DATE(MSGPOSTEDTIME)";
			if(extra === "ALL") {
				query = "SELECT DATE(MSGPOSTEDTIME) AS DATE, SUM(case when MSGSENTIMENT='POSITIVE' then 10 else 0 end) as POSITIVE, sum(case when MSGSENTIMENT='NEGATIVE' then 15 else 0 end) as NEGATIVE, sum(case when MSGSENTIMENT='AMBIVALENT' then 12 else 0 end) as AMBIVALENT, sum(case when MSGSENTIMENT='NEUTRAL' then 1 else 0 end) as NEUTRAL FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE MONTH(MSGPOSTEDTIME)= "+start+" AND YEAR(MSGPOSTEDTIME)= "+end+" GROUP BY DATE(MSGPOSTEDTIME)";
			}
			break;
	}
	return query;
}

module.exports = ServiceHandler;