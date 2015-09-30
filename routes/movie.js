var express = require('express'),
	timeout = require('connect-timeout'),
	router = express.Router(),
	Movie = require('../models/movie');

var movie = new Movie();

router.param('id', function(req, res, next, id) {
	req.movieName = movie.getName(id, function(result) {
		if(result) {
			var tableName = movie.getTableName(result);
			req.session.movieId = id;
			req.session.tableName = tableName;
			req.title = result;
			return next();
		} else {
			res.statusCode = 302; 
    		res.setHeader("Location", "/");
    		res.end();
		}
	});
});

router.get('/box-office/:id/:movie', function(req, res) {
	res.render('movie', { title: req.title});
});

/* movie service */
router.get('/get/all', function(req, res, next) {
	movie.getAll(function(result) {
		res.send(result);
	});
});

router.param('search', function(req, res, next, search) {
	movie.loadAll(req.query.boxOffice, req.query.twitter, function(err, data){
		req.err = err;
		req.data = data;
		return next();
	});
});

router.get('/load/:search', function(req, res, next) {
	if (req.err) {
		res.json({
			err : true,
			data: req.data
		});
	} else {
		req.session.retrieve = req.data;
		res.json({
			err : null,
			data: req.data
		});
	}
});

router.param('query', function(req, res, next, query) {
	//default request timeout is 2 minutes
	res.setTimeout(600000);
	//req.setTimeout(3600000);
	var sessionRetrieve = (typeof req.session.retrieve === "undefined") ? null : req.session.retrieve;
	if(req.url.indexOf("insert")>-1) {
		movie.insert(sessionRetrieve, query, function(err, data) {
			req.err = err;
			req.data = data;
			delete req.session.retrieve;
			return next();
		});
	} else if(req.url.indexOf("delete")>-1) {
		movie.delete(query, function(err, data) {
			req.err = err;
			req.data = data;
			return next();
		});
	} else {
		movie.replace(sessionRetrieve, req.query.boxOffice, req.query.twitter, function(err, data) {
			req.err = err;
			req.data = data;
			delete req.session.retrieve;
			return next();
		});
	}
});

router.get('/replace', function(req, res) {
	var sessionRetrieve = (typeof req.session.retrieve === "undefined") ? null : req.session.retrieve;
	movie.replace(sessionRetrieve, req.query.boxOffice, req.query.twitter, function(err, data) {
		console.log("Routes movie.js: replace callback")
		console.log(err)
		console.log(data)
		console.log(res)
		console.log(req)
		if (err) {
			res.json({
				err : true,
				data: data
			});
		} else {
			res.json({
				err : null,
				data: data
			});
		}
		console.log("DEL")
		delete req.session.retrieve;
	});
});

router.get('/insert/:query', function(req, res, next) {
	if (req.err) {
		res.json({
			err : true,
			data: req.data
		});
	} else {
		res.json({
			err : null,
			data: req.data
		});
	}

// res.writeHead(200, { 'Content-Type': 'application/json' });
// res.write(JSON.stringify({ status: OK }));
// res.end();
});

router.get('/delete/:query', function(req, res, next) {
	if (req.err) {
		res.json({
			err : true,
			data: req.data
		});
	} else {
		res.json({
			err : null,
			data: req.data
		});
	}
});

module.exports = router;