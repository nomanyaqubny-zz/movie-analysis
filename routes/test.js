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

router.get('/api/rscript', function(req, res, next) {
	var testModel = new TestModel();
	testModel.getRScript(function(err, data) {
		res.json({
			err : err,
			data: data
		});
	});
});

module.exports = router;