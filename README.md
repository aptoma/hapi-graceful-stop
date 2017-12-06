# hapi-graceful-stop

This plugin will listen on SIGINT singnals and execute `server.stop()` with configured timeout and execut process exit when done.

## Installation

This module is installed via npm:

	$ npm install @aptoma/hapi-graceful-stop

## Example

```javascript

const Hapi = require('hapi');

const server = new Hapi.Server();

server.register({register: require('@aptoma/hapi-graceful-stop'), options: {timeout: 2000}});

server.start();

```

Running function after `server.stop()` e.g for ending db connections.

```javascript

const Hapi = require('hapi');

const server = new Hapi.Server();

const opts = {
	timeout: 2000, // optional, defaults to 5000 ms
	afterStopTimeout: 1000, // optional, defaults to 2000 ms
	afterStop: function (done) {
		// do cleanup
		done();
	}
};

server.register({register: require('@aptoma/hapi-graceful-stop'), options: opts});

server.start();

```
