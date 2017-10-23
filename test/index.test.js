'use strict';
const Hapi = require('hapi');
const gracefulStop = require('..');
require('should');

describe('hapi-graceful-stop', () => {
	const orgExit = process.exit;

	beforeEach(() => {
		process.removeAllListeners('SIGINT');
		process.exit = () => {};
	});

	afterEach(() => {
		process.exit = orgExit;
	});

	it('should call server.stop on SIGINT signal', (done) => {
		const server = new Hapi.Server();
		server.register({plugin: gracefulStop, options: {timeout: 500}});


		server.events.on('stop', () => {
			done();
		});

		process.emit('SIGINT');
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
			.then(() => {
				process.emit('SIGINT');
			})
			.catch(done);
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
			.then(() => {
				process.exit = function (code) {
					code.should.equal(0);
					done();
				};

				process.emit('SIGINT');
			})
			.catch(done);
	});

	it('should call process.exit', (done) => {
		const server = new Hapi.Server();
		server
			.register({plugin: gracefulStop, options: {timeout: 1}})
			.then(() => {
				process.exit = function (code) {
					code.should.equal(0);
					done();
				};

				process.emit('SIGINT');
			})
			.catch(done);
	});

});
