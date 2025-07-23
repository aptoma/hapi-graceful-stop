export interface Options {
	readonly timeout: number;
	readonly afterStopTimeout: number;
	readonly afterStop: () => Promise<void>;
}
