'use strict';
var Hapi = require('hapi');
var gracefulStop = require('..');
require('should');

describe('hapi-graceful-stop', function () {
	beforeEach(function () {
		process.removeAllListeners('SIGINT');
	});

	it('should call server.stop on SIGINT signal with configured timeout', function (done) {
		var server = new Hapi.Server();
		server.connection({port: 3000});

		server.register({register: gracefulStop, options: {timeout: 500}}, function (err) {
			if (err) {
				return done(err);
			}

			server.stop = function (opts) {
				opts.timeout.should.equal(500);
				done();
			};

			process.emit('SIGINT');
		});
	});

	it('should call process.exit', function (done) {
		var server = new Hapi.Server();
		server.connection({port: 3000});
		server.register({register: gracefulStop, options: {timeout: 1}}, function (err) {
			if (err) {
				return done(err);
			}

			process.exit = function (code) {
				code.should.equal(0);
				done();
			};

			process.emit('SIGINT');
		});
	});

});
