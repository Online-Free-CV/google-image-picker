import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true, // simpler and more stable than { entry: ... }
  sourcemap: false,
  clean: true,
  splitting: false,
  minify: true,
  external: ["react", "react-dom"],
  outExtension: () => ({ js: ".mjs" })
});
