// Load the routes
var routes = require('./routes');
var movie = require('./routes/movie');
var service = require('./routes/service');

module.exports = function(app) {
  // Define the routes
  app.use('/', routes);
  app.use('/movie', movie);
  app.use('/api/service', service);
};