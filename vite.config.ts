import { defineConfig, loadEnv } from "vite";
import { vitePlugins } from "./vite/plugins";
import { resolve } from "path";

function pathResolve(dir: string) {
  return resolve(__dirname, ".", dir);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const root = process.cwd();
  const env = loadEnv(mode, root);

  return {
    base: env.VITE_PUBLIC_PATH,
    root,
    // plugin
    plugins: vitePlugins(env),
    // alias
    resolve: {
      alias: {
        "@": pathResolve("src"),
        "@tabler/icons-react": "@tabler/icons-react/dist/esm/icons/index.mjs",
      },
      // https://github.com/vitejs/vite/issues/178#issuecomment-630138450
      extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
    },
    // https://vitejs.cn/config/#esbuild
    esbuild: {
      // pure: env.VITE_DROP_CONSOLE ? ["console.log", "debugger"] : [],
      pure: mode === "production" ? ["console.log"] : [],
      //  drop: ["console", "debugger"],
    },
    // server config
    server: {
      // host: '192.168.0.0',
      port: 8088,
      open: true, // auto open
      hmr: true,
      cors: true,
      // Cross domain
      // proxy: {
      //     '/api': {
      //         target: 'http://',
      //         changeOrigin: true,
      //         ws: true,
      //         rewrite: (path) => path.replace(/^\/api/, '')
      //     }
      // }
    },

    // build: https://vitejs.cn/config/#build-target
    build: {
      target: "modules",
      outDir: "dist",
    },

    optimizeDeps: {
      exclude: [
        //"@babylonjs/core",
        // "@babylonjs/gui",
        // "@babylonjs/gui-editor",
        "@babylonjs/inspector",
        // "@babylonjs/materials",
        "@babylonjs/havok",
        "@babylonjs/addons",
        "@babylonjs/loaders",
        "@babylonjs/serializers",
        //"@tabler/icons-react",
      ],
    },
  };
});
