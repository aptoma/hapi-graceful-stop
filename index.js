'use strict';

exports.register = function (server, options, next) {
	var timeout = options.timeout || 5000;

	process.on('SIGINT', function () {
		server.log('graceful-stop', 'Received SIGINT, initiating graceful stop with timeout ' + timeout + 'ms');
		server.root.stop({timeout: timeout}, function () {
			server.log('graceful-stop', 'Server stopped');
			process.exit(0);
		});
	});

	next();
};

exports.register.attributes = {
	name: 'graceful-stop'
};
