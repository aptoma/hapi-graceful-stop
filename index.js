'use strict';

function exit(timeout, fn, server) {
	if (typeof (fn) !== 'function') {
		return process.exit(0);
	}

	server.log('graceful-stop', `Running options.afterStop function with timeout ${timeout} ms`);

	const id = setTimeout(() => {
		server.log('graceful-stop', 'options.afterStop function timedout');
		process.exit(0);
	}, timeout);

	fn(() => {
		clearTimeout(id);
		process.exit(0);
	});
}

module.exports = {
	name: 'graceful-stop',
	register(server, options) {
		const timeout = options.timeout || 5000;
		const afterStopTimeout = options.afterStopTimeout || 2000;

		process.on('SIGINT', async () => {
			server.log('graceful-stop', `Received SIGINT, initiating graceful stop with timeout ${timeout} ms`);

			server.events.on('stop', () => {
				exit(afterStopTimeout, options.afterStop, server);
			});

			await server.stop({timeout});
			server.log('graceful-stop', 'Server stopped');
		});
	}
};
