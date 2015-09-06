var	express = require('express'),
	router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	var message;
	if(!req.app.get('databaseConnection')) {message = 'dashDB service is not attached.'}
	res.render('index', { title: '{/movie} Box Office Prediction', err: message});
});

/*code above*/
module.exports = router;