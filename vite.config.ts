import { defineConfig } from "vite";

export default defineConfig({
  base: "/fewebcontent/",
  root: "src",
  build: {
    outDir: "../dist",   // output outside src
    rollupOptions: {
      input: {
        image: "./src/image.html",
        index: "./src/index.html",
      },
    },
  },
});
