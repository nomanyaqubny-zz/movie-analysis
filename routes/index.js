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