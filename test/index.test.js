const {describe, beforeEach, it, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const Hapi = require('@hapi/hapi');
const gracefulStop = require('..');

describe('hapi-graceful-stop', () => {
	const orgExit = process.exit;

	['SIGINT', 'SIGTERM'].forEach((signal) => {
		describe(signal, () => {
			beforeEach(() => {
				process.removeAllListeners(signal);
				process.exit = () => {};
			});

			afterEach(() => {
				process.exit = orgExit;
			});

			it('should call server.stop', async () => {
				const server = new Hapi.Server();
				await server.register({plugin: gracefulStop, options: {timeout: 500}});
				await server.start();
				const {promise, resolve} = Promise.withResolvers();
				server.events.on('stop', () => resolve(true));
				process.emit(signal);
				assert(await promise);
			});

			it('should call option.afterStop', async () => {
				const server = new Hapi.Server();

				const {promise, resolve} = Promise.withResolvers();
				const opts = {
					timeout: 500,
					afterStop() {
						resolve(true);
					}
				};

				await server.register({plugin: gracefulStop, options: opts});
				await server.start();
				process.emit(signal);
				assert(await promise);
			});

			it('should call process.exit if option.afterStop times out', async () => {
				const server = new Hapi.Server();

				const opts = {
					timeout: 500,
					afterStopTimeout: 1,
					afterStop: () => {}
				};

				await server.register({plugin: gracefulStop, options: opts});
				await server.start();

				const {promise, resolve} = Promise.withResolvers();
				process.exit = (code) => {
					resolve(code);
				};

				process.emit(signal);
				assert.equal(await promise, 0);
			});

			it('should call process.exit', async () => {
				const server = new Hapi.Server();
				await server.register({plugin: gracefulStop, options: {timeout: 1}});
				await server.start();

				const {promise, resolve} = Promise.withResolvers();
				process.exit = (code) => {
					resolve(code);
				};

				process.emit(signal);
				assert.equal(await promise, 0);
			});
		});
	});

	it('should call postStop if server was stopped manually', async () => {
		const server = new Hapi.Server();

		const {promise, resolve} = Promise.withResolvers();
		const opts = {
			timeout: 500,
			afterStop() {
				resolve(true);
			}
		};

		await server.register({plugin: gracefulStop, options: opts});
		await server.start();
		await server.stop();
		assert(await promise);
	});
});
