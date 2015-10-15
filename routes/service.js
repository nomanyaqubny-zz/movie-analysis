/********************************************
Route service.js is responsible for handling request from analyze page

1. get data for different graph and charts services

Author: Noman Yaqub
*********************************************/

var express = require('express'),
	router = express.Router(),
	ServiceHandler = require('../models/serviceHandler'),
	config = require('nconf');

var serviceHandler = new ServiceHandler();

router.param('service', function(req, res, next, serviceName) {
	// ... Perform database query and
	// ... Store the query result object from the database in the req object
	serviceHandler.fetch(serviceName, req.session.tableName, req.session.movieId, req.query.start, req.query.end, req.query.extra, function(err, result) {
		req.result = result;
		return next();
	});
});

router.get('/get/data/visualize/:service', function(req, res, next) {
	//... Do something with req.result set by the router.param
	//console.log(req.result);
	res.send(req.result);
});

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