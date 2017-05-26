'use strict';
/*
	WARNING -- Adding some middleware at the whole app level will break elasticsearch-head.
	Middleware can be added to a route rather than globally and that should solve the problem.
	However, be sure the route does not overlap with elasticsearch-head or the cluster paths.
*/

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var proxy = require('http-proxy-middleware');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
var clusters;
try {
	clusters = require('./clusters.js');
	if(clusters.home) {
		console.log('Cluster must not share the path "home"');
		process.exit(1);
	}
} catch (e) {
	console.log('./clusters.js not found, using default localhost:9200');
	clusters = {
		es: { target: 'http://localhost:9200', secure: false },
	};
}
// uncomment after placing your favicon in ./home
//app.use(favicon(path.join(__dirname, 'home', 'favicon.ico')));
app.use(logger('dev'));
app.use('/:cluster/_plugin/head', express.static(path.join(__dirname, '_site')));
app.use('/home', express.static(path.join(__dirname, 'home')));
Object.keys(clusters).forEach((clusterPath) => {
	app.use(
		'/' + clusterPath,
		proxy(
			Object.assign(clusters[clusterPath],
			{ changeOrigin: true, pathRewrite: (path) => { return path.substring(clusterPath.length + 2) }}
		)
	));
});
//The root path / can not be used to host static files and still be able to route elasticsearch-head to clusters, so redirect to /home/
app.use(/(index.html?)?$/, function (req, res, next) {
	res.redirect('/home');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
