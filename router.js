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