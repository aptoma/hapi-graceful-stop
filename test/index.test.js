'use strict';
const Hapi = require('@hapi/hapi');
const gracefulStop = require('..');
require('should');

describe('hapi-graceful-stop', () => {
	const orgExit = process.exit;

	[
		'SIGINT',
		'SIGTERM'
	].forEach((signal) => {
		describe(signal, () => {

			beforeEach(() => {
				process.removeAllListeners(signal);
				process.exit = () => {};
			});

			afterEach(() => {
				process.exit = orgExit;
			});

			it('should call server.stop', (done) => {
				const server = new Hapi.Server();
				server
					.register({plugin: gracefulStop, options: {timeout: 500}})
					.then(() => server.start())
					.then(() => {
						server.events.on('stop', done);
						process.emit(signal);
					});
			});

			it('should call option.afterStop', (done) => {
				const server = new Hapi.Server();

				const opts = {
					timeout: 500,
					afterStop(cb) {
						cb(); // eslint-disable-line callback-return
						done();
					}
				};

				server
					.register({plugin: gracefulStop, options: opts})
					.then(() => server.start())
					.then(() => process.emit(signal));
			});

			it('should call process.exit if option.afterStop times out', (done) => {
				const server = new Hapi.Server();

				const opts = {
					timeout: 500,
					afterStopTimeout: 1,
					afterStop: () => {}
				};

				server
					.register({plugin: gracefulStop, options: opts})
					.then(() => server.start())
					.then(() => {
						process.exit = function (code) {
							code.should.equal(0);
							done();
						};

						process.emit(signal);
					});
			});

			it('should call process.exit', (done) => {
				const server = new Hapi.Server();
				server
					.register({plugin: gracefulStop, options: {timeout: 1}})
					.then(() => server.start())
					.then(() => {
						process.exit = function (code) {
							code.should.equal(0);
							done();
						};

						process.emit(signal);
					});
			});
		});
	});
});
