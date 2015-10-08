"use strict";

var request = require('request'),
    config = require('nconf'),
    version = 'api:' + config.get("api:version");

function Test() {}

Test.prototype = {
	dashDBR: function(callback) {
		console.log("Testing dashDBR API");
		var command = "library(ibmdbR)\ncon <- idaConnect(\"BLUDB\",\"\",\"\")\nidaInit(con)\ntweetCountsPerState <- idaQuery(\"SELECT SMAAUTHORSTATE AS STATE, DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM TWEETS_SOUTHPAW a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE DATE(MSGPOSTEDTIME)>'2015-01-15' GROUP BY SMAAUTHORSTATE,DATE(MSGPOSTEDTIME) ORDER BY DATE\")\n#Calculate the decline of tweets between opening weekend and now\ntweetCountsPerState$CNT <- as.numeric(tweetCountsPerState$CNT)\ntweetCountsPerState <- na.omit(tweetCountsPerState)\nx <- by(tweetCountsPerState,tweetCountsPerState$STATE,function(df){df[nrow(df),\"CNT\"]/df[1,\"CNT\"]}, simplify=F)\nresult <- data.frame(MOVIE_ID=22,STATE_ISO=names(x),DECLINE_RATE=as.numeric(as.vector(x)))\n#Write this to a db table\nsqlSave(con, result, tablename = \"TWEET_ALERTS\", append = TRUE, rownames = FALSE)";
		request({
	        method: "POST",
	        url: "https://awh-yp-small03.services.dal.bluemix.net:8443/console/blushiftservices/BluShiftHttp.do",
	        qs: {
	        	'profileName' : 'BLUDB',
	        	'userid' : 'dash100835',
	        	'cmd' : 'RScriptRunScript',
	        	// 'command' : "library(ibmdbR)\nlibrary(AnomalyDetection)\ncon <- idaConnect(\"BLUDB\",\"\",\"\")\nidaInit(con)\ndf <- idaQuery(\"SELECT * FROM dash015712.IDUGIOTDEMO\",as.is=F)\nres = AnomalyDetectionVec(df[,2], max_anoms=0.02, period=3, direction='both', plot=TRUE, xlabel = \"Time\", ylabel=\"Temp\")\nlength(res$anoms[[1]])\nprint(res$anoms, row.names=FALSE)",
	        	'command' : command
	        },
	        auth: {
	            'user': 'dash100835',
	            'pass': 'WHsjHRi8SH3f'
	        },
	        headers: {
	            'Content-Type': 'application/x-www-form-urlencoded'
	        }
	    }, function(err, response, data) {
	    	console.log(data)
	    	console.log(data.items)
	    	callback(err, data)
	        // if (err) {
	        //     callback(err);
	        // } else {
	        //     if (response.statusCode == 200) {
	        //         try {
	        //             callback(null, JSON.parse(data));
	        //         } catch(e) {
	        //             callback({ 
	        //                 error: { 
	        //                     description: e.message
	        //                 },
	        //                 status_code: response.statusCode
	        //             });
	        //         }
	        //     } else {
	        //         callback({ 
	        //             error: {
	        //                 description: data 
	        //             },
	        //             status_code: response.statusCode
	        //         });
	        //     }
	        // }
	    });
	}, 
	envVariables : function(callback) {
    	var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
    	var twitterInsight = services["twitterinsights"] ? services["twitterinsights"][0].credentials : "{}";
    	var dashDB = services["dashDB"] ? services["dashDB"][0].credentials : "{}";

    	var defaults = config.get(version);

    	callback(null, {VCAP_SERVICES: {all:services, twitterInsight:twitterInsight, dashDB:dashDB}, defaults : defaults})
	}
}

module.exports = Test;