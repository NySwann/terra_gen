import react from '@vitejs/plugin-react-swc'
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { createHtmlPlugin } from 'vite-plugin-html'

export const vitePlugins = (env: Record<string, string>) => {
  return [
    react(),
    vanillaExtractPlugin(),
    createHtmlPlugin({
      inject: {
        data: {
          title: env.VITE_APP_TITLE // Need to reference environment variables in html
        }
      }
    }),
    // full reload because hmr is broken
    {
      name: "full-reload",
      handleHotUpdate({ server }) {
        server.ws.send({ type: "full-reload" });
        return [];
      },
    },
  ]
}