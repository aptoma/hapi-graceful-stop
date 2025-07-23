const createHttpTerminator = require('lil-http-terminator');

async function postHook(timeout, fn, server) {
	if (typeof fn !== 'function') {
		return;
	}

	const {promise, resolve} = Promise.withResolvers();
	server.events.on('stop', () => resolve());
	await promise;

	server.log(
		'graceful-stop',
		`Running options.afterStop function with timeout ${timeout} ms`
	);

	const id = setTimeout(() => {
		server.log('graceful-stop', 'options.afterStop function timeout');
		process.exit(0);
	}, timeout).unref();

	await fn();
	clearTimeout(id);
}

module.exports = {
	name: 'graceful-stop',
	/**
	 * @param {import('@hapi/hapi').Server} server
	 * @param {import('./types').Options} options
	 */
	register(server, options) {
		const timeout = options.timeout || 5000;
		const afterStopTimeout = options.afterStopTimeout || 2000;

		const terminator = createHttpTerminator({
			server: server.listener,
			maxWaitTimeout: timeout,
			gracefulTerminationTimeout: timeout * 0.9
		});

		const postHookPromise = postHook(
			afterStopTimeout,
			options.afterStop,
			server
		);

		async function shutdown(signal) {
			server.log(
				'graceful-stop',
				`Received ${signal}, initiating graceful stop with timeout ${timeout} ms`
			);
			await terminator.terminate();
			await server.stop({timeout: afterStopTimeout});
			await postHookPromise;
			server.log('graceful-stop', 'Server stopped');
			process.exit(0);
		}

		process.once('SIGINT', async () => await shutdown('SIGINT'));
		process.once('SIGTERM', async () => await shutdown('SIGTERM'));
	}
};
