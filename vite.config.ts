import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'Review Pro AI',
            short_name: 'ReviewPro',
            description: 'AI-powered English mock exam study tool',
            theme_color: '#F5F5F7',
            background_color: '#F5F5F7',
            display: 'standalone',
            orientation: 'portrait',
            icons: [
              {
                src: '/icon-192.png', // 실제 배포시엔 본인의 아이콘 경로(public 폴더)로 바꾸세요
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/icon-192.png', // 실제 배포시엔 본인의 아이콘 경로로 바꾸세요
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
