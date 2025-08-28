import { defineConfig } from "vite";

export default defineConfig({
	// ...
	build: {
		target: "esnext", // you can also use 'es2020' here
	},
	optimizeDeps: {
		esbuildOptions: {
			target: "esnext", // you can also use 'es2020' here
		},
	},
});
