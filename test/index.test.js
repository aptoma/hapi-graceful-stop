const {describe, beforeEach, it, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const Hapi = require('@hapi/hapi');
const gracefulStop = require('..');

describe('hapi-graceful-stop', () => {
	const orgExit = process.exit;

	['SIGINT', 'SIGTERM'].forEach((signal) => {
		describe(signal, () => {
			beforeEach(() => {
				process.removeAllListeners('SIGINT');
				process.removeAllListeners('SIGTERM');
				process.exit = () => {};
			});

			afterEach(() => {
				process.removeAllListeners('SIGINT');
				process.removeAllListeners('SIGTERM');
				process.exit = orgExit;
			});

			it('should await beforeStop before terminating HTTP and running afterStop', async (t) => {
				const server = new Hapi.Server();
				const hook = Promise.withResolvers();
				const calls = [];
				const close = server.listener.close;
				t.mock.method(server.listener, 'close', function (...args) {
					if (this.listening) {
						calls.push('terminate');
					}
					return close.apply(this, args);
				});
				await server.register({
					plugin: gracefulStop,
					options: {
						timeout: 500,
						beforeStop: async () => {
							calls.push('beforeStop');
							await hook.promise;
							calls.push('beforeStop complete');
						},
						afterStop: () => {
							calls.push('afterStop');
						}
					}
				});
				await server.start();
				assert.deepEqual(calls, []);

				const shutdown = process.listeners(signal).at(-1)();
				try {
					assert.deepEqual(calls, ['beforeStop']);
					assert.equal(server.listener.listening, true);
				} finally {
					hook.resolve();
					await shutdown;
				}
				assert.deepEqual(calls, [
					'beforeStop',
					'beforeStop complete',
					'terminate',
					'afterStop'
				]);
			});

			it('should support a synchronous beforeStop', async (t) => {
				const server = new Hapi.Server();
				const beforeStop = t.mock.fn();
				await server.register({plugin: gracefulStop, options: {beforeStop}});
				await server.start();
				await process.listeners(signal).at(-1)();
				assert.equal(beforeStop.mock.callCount(), 1);
				assert.equal(server.listener.listening, false);
			});

			for (const asynchronous of [false, true]) {
				it(`should continue shutdown when beforeStop ${asynchronous ? 'rejects' : 'throws'}`, async (t) => {
					const server = new Hapi.Server();
					const error = new Error('Cleanup failed');
					function fail() {
						throw error;
					}
					await server.register({
						plugin: gracefulStop,
						options: {beforeStop: asynchronous ? async () => fail() : fail}
					});
					await server.start();
					const log = t.mock.fn();
					server.events.on('log', log);
					const exit = t.mock.method(process, 'exit', () => {});
					await process.listeners(signal).at(-1)();
					assert(
						log.mock.calls.some(({arguments: [event]}) => event.error === error)
					);
					assert.equal(server.listener.listening, false);
					assert.deepEqual(exit.mock.calls[0].arguments, [0]);
				});
			}

			for (const beforeStopTimeout of [undefined, 100]) {
				it(`should continue shutdown after beforeStop timeout (${beforeStopTimeout ?? 'default'})`, async (t) => {
					const server = new Hapi.Server();
					const hook = Promise.withResolvers();
					await server.register({
						plugin: gracefulStop,
						options: {beforeStopTimeout, beforeStop: () => hook.promise}
					});
					await server.start();
					const log = t.mock.fn();
					server.events.on('log', log);
					const exit = t.mock.method(process, 'exit', () => {});
					t.mock.timers.enable({apis: ['setTimeout']});
					const shutdown = process.listeners(signal).at(-1)();
					t.mock.timers.tick((beforeStopTimeout ?? 2000) - 1);
					assert.equal(server.listener.listening, true);
					assert.equal(exit.mock.callCount(), 0);
					t.mock.timers.tick(1);
					t.mock.timers.reset();
					await shutdown;
					assert(
						log.mock.calls.some(
							({arguments: [event]}) =>
								event.data === 'options.beforeStop function timeout'
						)
					);
					assert.equal(server.listener.listening, false);
					assert.deepEqual(exit.mock.calls[0].arguments, [0]);
					hook.reject(new Error('Late cleanup failure'));
				});
			}

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
