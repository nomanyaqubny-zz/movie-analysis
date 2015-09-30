// Load the routes
var routes = require('./routes');
var movie = require('./routes/movie');
var service = require('./routes/service');
var test = require('./routes/test');
var timeout = require('connect-timeout');


module.exports = function(app) {
	app.use(timeout(3600000));
	app.use(haltOnTimedout);
 	// Define the routes
  	app.use('/', routes);
  	app.use('/movie', movie);
	app.use('/api/service', service);
  	app.use('/test', test);
  	function haltOnTimedout(req, res, next){
  		if (!req.timedout) next();
	}
};