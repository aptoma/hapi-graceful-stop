'use strict';

function exit(timeout, fn, server) {
	if (typeof(fn) !== 'function') {
		return process.exit(0);
	}

	server.log('graceful-stop', 'Running options.afterStop function with timeout ' + timeout + 'ms');

	setTimeout(function () {
		server.log('graceful-stop', 'options.afterStop function timedout');
		process.exit(0);
	}, timeout);

	fn(function () {
		process.exit(0);
	});
}

exports.register = function (server, options, next) {
	var timeout = options.timeout || 5000;
	var afterStopTimeout = options.afterStopTimeout || 2000;

	process.on('SIGINT', function () {
		server.log('graceful-stop', 'Received SIGINT, initiating graceful stop with timeout ' + timeout + 'ms');

		server.root.stop({timeout: timeout}, function () {
			server.log('graceful-stop', 'Server stopped');
			exit(afterStopTimeout, options.afterStop, server);
		});
	});

	next();
};

exports.register.attributes = {
	name: 'graceful-stop'
};

