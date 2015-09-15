"use strict";

var request = require('request'),
    config = require('nconf'),
    version = 'api:' + config.get("api:version");

function Test() {}

Test.prototype = {
	dashDBR: function(callback) {
		console.log("Testing dashDBR API");
		var command = "library(ibmdbR)\nlibrary(ggplot2)\nlibrary(reshape2)\ncon <- idaConnect(\"BLUDB\",\"\",\"\")\nidaInit(con)\ntweetCounts <- idaQuery(\"SELECT DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM TWEETS_ANT_MAN WHERE DATE(MSGPOSTEDTIME)>'2015-01-11' GROUP BY DATE(MSGPOSTEDTIME) ORDER BY DATE\")\ntweetCountsPerState <- idaQuery(\"SELECT SMAAUTHORSTATE AS STATE, DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM TWEETS_ANT_MAN WHERE DATE(MSGPOSTEDTIME)>'2015-01-15' GROUP BY SMAAUTHORSTATE,DATE(MSGPOSTEDTIME) ORDER BY DATE\")\nboxOffice <- idaQuery(\"SELECT DATE, GROSS FROM BOX_OFFICE WHERE MOVIE_ID=11\")\ndf<-data.frame(day= 1:nrow(boxOffice),boxoffice=boxOffice$GROSS/1000,boxofficeSmooth=filter(boxOffice$GROSS,rep(1/7,7),sides=2)/1000,tweetCount=tweetCounts[1:nrow(boxOffice),'CNT'],tweetCountSmooth=filter(tweetCounts[1:nrow(boxOffice),'CNT'],rep(1/3,3),sides=2))\n#ggplot(df,aes(tweetCountSmooth,boxofficeSmooth))+geom_point()+geom_smooth()\n#gg <- melt(df[,c('day','boxoffice','tweetCount')],id=\"day\")\n#ggplot(gg,aes(x=day,y=value,color=variable))+geom_line()\n#f<-function(df){df$CNT<-filter(df$CNT,rep(1/3,3),2);df[nrow(df),\"CNT\"]/df[5,\"CNT\"]}\nx<-by(tweetCountsPerState,tweetCountsPerState$STATE,function(df){df[nrow(df),\"CNT\"]/df[5,\"CNT\"]}, simplify=F)\nresult <- data.frame(STATE=names(x),Q=as.numeric(as.vector(x)))\nas.ida.data.frame(result,\"TWEET_ALERTS\",clear.existing=T)\nresult";
		request({
	        method: "POST",
	        url: "https://bluemix05.bluforcloud.com:8443/console/blushiftservices/BluShiftHttp.do",
	        qs: {
	        	'profileName' : 'BLUDB',
	        	'userid' : 'dash015712',
	        	'cmd' : 'RScriptRunScript',
	        	// 'command' : "library(ibmdbR)\nlibrary(AnomalyDetection)\ncon <- idaConnect(\"BLUDB\",\"\",\"\")\nidaInit(con)\ndf <- idaQuery(\"SELECT * FROM dash015712.IDUGIOTDEMO\",as.is=F)\nres = AnomalyDetectionVec(df[,2], max_anoms=0.02, period=3, direction='both', plot=TRUE, xlabel = \"Time\", ylabel=\"Temp\")\nlength(res$anoms[[1]])\nprint(res$anoms, row.names=FALSE)",
	        	'command' : command
	        },
	        auth: {
	            'user': 'dash015712',
	            'pass': 'iEtfqUnzIwce'
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