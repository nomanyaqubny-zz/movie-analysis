/********************************************
Router movie.js is reponsible for all the requests to 
	1. get(All)
	2. fetch
	3. insert
	4. replace
	5. delete
movie(s) from database. 

it requires 
	1. Express Router module
	2. Model movie.js file to perform operation on movie data

Author: Noman Yaqub
*********************************************/

var express = require('express'),
	router = express.Router(),
	Movie = require('../models/movie');

router.param('id', function(req, res, next, id) {
	var movie = new Movie();

	movie.getName(id, function(result) {
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
	var movie = new Movie();

	movie.getAll(function(result) {
		res.send(result);
	});
});

router.param('search', function(req, res, next, search) {
	var movie = new Movie();

	movie.loadAll(req.query.boxOffice, req.query.twitter, function(err, data){
		req.err = err;
		req.data = data;
		req.session.movie = movie;
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
		res.json({
			err : null,
			data: req.data
		});
	}
});

router.param('query', function(req, res, next, query) {
		
	if(req.url.indexOf("delete")>-1) {
		var movie = new Movie();

		movie.delete(query.replace(/\'/g,"''"), function(err, data) {
			req.err = err;
			req.data = data;
			return next();
		});
	} else {
		//default request timeout is 2 minutes
		res.setTimeout(600000);
		var retrievedMovie = (typeof req.session.movie === "undefined") ? null : req.session.movie;

		if(retrievedMovie && retrievedMovie.tweetsCount <= 50000) {
			var movie = new Movie(retrievedMovie.name, retrievedMovie.boxOfficeNumbers, retrievedMovie.tweetsCount, retrievedMovie.twitterQuery);

			movie.replace(req.query.boxOffice, req.query.twitter, function(err, data) {
				req.err = err;
				req.data = data;
				delete req.session.movie;
				return next();
			});
		} else if (retrievedMovie && retrievedMovie.tweetsCount > 50000) {
			req.err = true;
			req.data = {message:"Tweets exceed the upper limit of 50000 to be fetched for a movie. Use additional twitter query parameters to filter tweets. Hint: add one or more hashtags, use posted:startTime or/and followers_count:lowerLimit or refer to manual"};
			return next();
		} else {
			req.err = true;
			req.data = {message:"Retrieve Movie Data First"};
			return next();
		}
	}
});

router.get('/replace/:query', function(req, res, next) {
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