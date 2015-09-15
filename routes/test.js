var	express = require('express'),
	router = express.Router(),
	TestModel = require('../models/test');

router.get('/api/dashDB/R', function(req, res, next) {
	var testModel = new TestModel();
	testModel.dashDBR(function(err, data) {
		res.json({
			err : err,
			data: data
		});
	});
});

router.get('/api/env/var', function(req, res, next) {
	var testModel = new TestModel();
	testModel.envVariables(function(err, data) {
		res.json({
			err : err,
			data: data
		});
	});
});

module.exports = router;