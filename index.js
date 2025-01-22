'use strict';

const createHttpTerminator = require('lil-http-terminator');

function exit(timeout, fn, server) {
	if (typeof (fn) !== 'function') {
		return process.exit(0);
	}

	server.log('graceful-stop', `Running options.afterStop function with timeout ${timeout} ms`);

	const id = setTimeout(() => {
		server.log('graceful-stop', 'options.afterStop function timeout');
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

		const terminator = createHttpTerminator({
			server: server.listener,
			maxWaitTimeout: timeout,
			gracefulTerminationTimeout: timeout * 0.9
		});

		server.events.on('stop', () => {
			exit(afterStopTimeout, options.afterStop, server);
		});

		async function shutdown(signal) {
			server.log('graceful-stop', `Received ${signal}, initiating graceful stop with timeout ${timeout} ms`);
			await terminator.terminate();
			await server.stop({timeout: afterStopTimeout});
			server.log('graceful-stop', 'Server stopped');
		}

		process.once('SIGINT', async () => await shutdown('SIGINT'));
		process.once('SIGTERM', async () => await shutdown('SIGTERM'));
	}
};
