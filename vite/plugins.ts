import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { createHtmlPlugin } from 'vite-plugin-html'

export const vitePlugins = (env: Record<string, string>) => {
  return [

    // tried @vitejs/plugin-react-swc, hmr broken
    react({
       include: "**/*.tsx",
    }),
    vanillaExtractPlugin(),
    createHtmlPlugin({
      inject: {
        data: {
          title: env.VITE_APP_TITLE // Need to reference environment variables in html
        }
      }
    })
  ]
}