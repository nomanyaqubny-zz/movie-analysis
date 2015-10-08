var express = require('express'),
	router = express.Router(),
	config = require('nconf');

var fetcher;
var version = config.get("api:version");

// middleware specific to this router
router.use(function(req, res, next) {
	if (version === "v1") {
		fetcher = require('../models/rest');
	} else if (version === "v2" || version === "v3") {
		fetcher = require('../models/dashdb');
	} else {
		fetcher = null;
	}
	return next();
});

router.param('service', function(req, res, next, serviceName) {
	// ... Perform database query and
	// ... Store the query result object from the database in the req object
	fetcher.fetch(selectQueryByServiceName(serviceName, req.session.tableName, req.session.movieId, req.query.start, req.query.end, req.query.extra), function(result) {
		req.result = result;
		return next();
	});
});

router.get('/get/data/visualize/:service', function(req, res, next) {
	//... Do something with req.result set by the router.param
	//console.log(req.result);
	res.send(req.result);
});

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
			query = "SELECT a.SMAAUTHORCITY AS CITYNAME, 10*COUNT(a.MSGID) AS COUNT FROM "+tableName+" a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE GROUP BY a.SMAAUTHORCITY, a.SMAAUTHORSTATE, b.STATE_ISO ORDER BY COUNT DESC FETCH FIRST ROW ONLY";
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

router.param('of', function(req, res, next, of) {
	// ... Perform database query and
	// ... Store the query result object from the database in the req object
	if (of === 'usstates') {
		req.result = { err : false, message: "success", data : JSON.parse(US_STATES)};
	}
	return next();
});

router.get('/get/data/list/:of', function(req, res, next) {
	//... Do something with req.result set by the router.param
	//console.log(req.result);
	res.send(req.result);
});

var US_STATES = '{"ALL":"All","AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO": "Colorado","CT": "Connecticut","DE": "Delaware","DC": "District of Columbia","FL": "Florida","GA": "Georgia","HI": "Hawaii","ID": "Idaho","IL": "Illinois","IN": "Indiana","IA": "Iowa","KS": "Kansa","KY": "Kentucky","LA": "Lousiana","ME": "Maine","MD": "Maryland","MA": "Massachusetts","MI": "Michigan","MN": "Minnesota","MS": "Mississippi","MO": "Missouri","MT": "Montana","NE": "Nebraska","NV": "Nevada","NH": "New Hampshire","NJ": "New Jersey","NM": "New Mexico","NY": "New York","NC": "North Carolina","ND": "North Dakota","OH": "Ohio","OK": "Oklahoma","OR": "Oregon","PA": "Pennsylvania","RI": "Rhode Island","SC": "South Carolina","SD": "South Dakota","TN": "Tennessee","TX": "Texas","UT": "Utah","VT": "Vermont","VA": "Virginia","WA": "Washington","WV": "West Virginia","WI": "Wisconsin","WY": "Wyoming"}';


module.exports = router;