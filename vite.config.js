import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { viteSingleFile } from "vite-plugin-singlefile"
import ViteYaml from '@modyfi/vite-plugin-yaml';

export default defineConfig({
  base: './',
  server: {
    port: 3456,
    strictPort: false,
  },
  preview: {
    host: "0.0.0.0",
    port: '8822'
  },
  plugins: [
    vue(),
    UnoCSS(),
    viteSingleFile(),
    viteBuildScript(),
    ViteYaml()
  ],
})


function viteBuildScript() {
  return {
    name: 'vite-build-script',
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === 'production') {
        return html.replace('</head>', `<script async defer src="https://stats.chromatone.center/script.js" data-website-id="a264a4d1-a96f-48b7-9868-9d3074e6a0dc"></script>
          <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope: ', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed: ', error);
          });
      });
    }
  </script>
  
  </head>`);
      }
      return html;
    },
  };
}