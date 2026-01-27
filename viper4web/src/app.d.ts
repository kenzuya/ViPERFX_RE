// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Type declaration for Vite worker&url imports
declare module '*?worker&url' {
	const workerUrl: string;
	export default workerUrl;
}

declare global {
	namespace App {
        interface Platform {
            env: Env
            cf: CfProperties
            ctx: ExecutionContext
        }

        interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties
		}

        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};