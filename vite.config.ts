import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",   // output outside src
    rollupOptions: {
      input: {
        image: "./src/image.html",
        video: "./src/video.html",
      },
    },
  },
});
