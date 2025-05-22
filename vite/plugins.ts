import react from '@vitejs/plugin-react-swc'
import glsl from 'vite-plugin-glsl'
import { createHtmlPlugin } from 'vite-plugin-html'

const vitePlugins = (env: Record<string, string>) => {
  return [
    react(),
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

export { vitePlugins }