import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],              // ESM only
  dts: { entry: "src/index.ts" },
  sourcemap: false,             // no maps
  clean: true,
  splitting: false,
  minify: true,
  external: ["react", "react-dom"],
  outExtension: () => ({ js: ".mjs" })
});
