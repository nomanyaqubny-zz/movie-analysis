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

/********************************************
Route index.js is responsible for to handle request to homepage of the application


Author: Noman Yaqub
*********************************************/

var	express = require('express'),
	router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	var message=null;
	if(req.app.get('databaseConnectionError')) {
		message = "No dashDB connection service connected. " + req.app.get('databaseConnectionError');
	}
	console.log(message)
	res.render('index', { title: '{/movie} Box Office Prediction', err: message});
});

/*code above*/
module.exports = router;