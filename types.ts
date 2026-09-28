export interface Options {
	readonly beforeStopTimeout?: number;
	readonly beforeStop?: () => void | Promise<void>;
	readonly timeout: number;
	readonly afterStopTimeout: number;
	readonly afterStop: () => Promise<void>;
}
