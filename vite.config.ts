// https://vitejs.dev/config/

import { resolve } from "path";
import { defineConfig } from "vite";

if (process.env.GITHUB_PAGES === "true") {
  console.log("Production build");
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/browser-ball-reloaded/" : "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        parent: resolve(__dirname, "/reloaded/parent.html"),
        child: resolve(__dirname, "/reloaded/child.html"),

        classicMain: resolve(__dirname, "/classic/index.html"),
        classicParent: resolve(__dirname, "/classic/parent.html"),
        classicChild: resolve(__dirname, "/classic/child.html"),
      },
    },
  },
});
