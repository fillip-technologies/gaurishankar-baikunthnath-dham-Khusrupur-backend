import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.js"],
    // Files run sequentially (not in parallel). Each file is still
    // module-isolated, so per-file state (rate-limiter stores, its own in-memory
    // Mongo) does not leak between files.
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
