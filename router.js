/********************************************
Here we associate different routes of the application to our app instance

routes are like controller of the application as in MVC pattern.
They are reponsible for handling different URIs having prefix like below e.g. /movie/some/thing would call movie.js route.


Author: Noman Yaqub
*********************************************/

// Load the routes
var routes = require('./routes'); //index.js
var movie = require('./routes/movie');
var service = require('./routes/service');
var test = require('./routes/test');

module.exports = function(app) {
  // Define the routes
  app.use('/', routes);
  app.use('/movie', movie);
  app.use('/api/service', service);
  app.use('/test', test);
};