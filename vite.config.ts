import { defineConfig, loadEnv } from "vite";
import { vitePlugins } from "./vite/plugins";
import { resolve } from "path";

function pathResolve(dir: string) {
  return resolve(__dirname, ".", dir);
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const root = process.cwd();
  const env = loadEnv(mode, root);

  return {
    plugins: vitePlugins(env),
    resolve: {
      alias: {
        "@": pathResolve("src"),
        "@tabler/icons-react": "@tabler/icons-react/dist/esm/icons/index.mjs",
      },
    },
    server: {
      watch: {
        usePolling: true
      }
    },
    optimizeDeps: {
      exclude: [
        "@babylonjs/inspector",
        "@babylonjs/havok",
      ],
    },
  }
})
