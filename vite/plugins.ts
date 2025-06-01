import react from '@vitejs/plugin-react-swc'
import glsl from 'vite-plugin-glsl'
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { createHtmlPlugin } from 'vite-plugin-html'

export const vitePlugins = (env: Record<string, string>) => {
  return [
    react(),
    vanillaExtractPlugin(),
    glsl(), // Convenient for you to write shader
    createHtmlPlugin({
      inject: {
        data: {
          title: env.VITE_APP_TITLE // Need to reference environment variables in html
        }
      }
    })
  ]
}