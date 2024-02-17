import { resolve } from "path";
import { defineConfig, ConfigEnv, UserConfigExport } from "vite";

// https://vitejs.dev/config/

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        parent: resolve(__dirname, "parent.html"),
        child: resolve(__dirname, "child.html"),
      },
    },
  },
});
