# hapi-graceful-stop

This plugin listens for `SIGINT` and `SIGTERM`, gracefully terminates HTTP connections,
calls `server.stop()`, and exits the process when shutdown is complete.

## Installation

This module is installed via npm:

	$ npm install @aptoma/hapi-graceful-stop

## Example

```javascript

const Hapi = require('@hapi/hapi');

const server = new Hapi.Server();

await server.register({plugin: require('@aptoma/hapi-graceful-stop'), options: {timeout: 2000}});

await server.start();

```

## Shutdown hooks

Use `beforeStop` to close WebSockets or end long-running SSE responses before
`lil-http-terminator` starts terminating HTTP connections. The hook can be synchronous
or return a promise, which is awaited before HTTP termination starts.

Use `afterStop` for cleanup after `server.stop()`, such as closing database connections.

```javascript

const Hapi = require('@hapi/hapi');

const server = new Hapi.Server();

const opts = {
	timeout: 2000, // optional, defaults to 5000 ms
	beforeStopTimeout: 1000, // optional, defaults to 2000 ms
	afterStopTimeout: 1000, // optional, defaults to 2000 ms
	beforeStop: async () => {
		await closeWebSockets();
		await endSseResponses();
	},
	afterStop: async () => {
		await closeDatabaseConnections();
	}
};

await server.register({plugin: require('@aptoma/hapi-graceful-stop'), options: opts});

await server.start();

```

The cleanup functions above are application-provided functions.

On either signal, shutdown runs in this order:

1. Run and await `beforeStop`, if provided.
2. Terminate HTTP connections using `timeout`.
3. Call `server.stop()`.
4. Await `afterStop`, if provided, then exit.

`beforeStopTimeout` is separate from the HTTP termination timeout. If `beforeStop`
throws, rejects, or exceeds its timeout, the plugin logs the failure and continues
shutdown. A timed-out hook is not cancelled and may continue running.

Calling `server.stop()` directly still runs `afterStop`, but does not run `beforeStop`
or invoke HTTP termination.
