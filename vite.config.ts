import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(Date.now().toString(36)),
  },
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache",
      "Surrogate-Control": "no-store",
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "app-runtime-sw.js",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["og-image.jpg", "pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-192x192.png", "pwa-maskable-512x512.png"],
      manifest: {
        name: "Sucena Empreendimentos - Controle Operacional",
        short_name: "Painel Sucena",
        description: "Sistema de controle operacional para gestão eficiente de empresas. Gerencie equipamentos, presença, atividades, documentos e muito mais.",
        theme_color: "#1a1a2e",
        background_color: "#0f0f23",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone", "minimal-ui"],
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        id: "/",
        dir: "ltr",
        lang: "pt-BR",
        categories: ["business", "productivity", "utilities"],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: ["navigate-existing", "auto"],
        },
        handle_links: "preferred",
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "media",
                accept: ["image/*", "application/pdf"],
              },
            ],
          },
        },
        protocol_handlers: [
          {
            protocol: "web+painelsucena",
            url: "/%s",
          },
        ],
        file_handlers: [
          {
            action: "/",
            accept: {
              "image/*": [".png", ".jpg", ".jpeg", ".webp"],
              "application/pdf": [".pdf"],
            },
          },
        ],
        edge_side_panel: {
          preferred_width: 400,
        },
        icons: [
          {
            src: "/pwa-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshots/screenshot-mobile.jpg",
            sizes: "540x960",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Dashboard Mobile - Painel Sucena",
          },
          {
            src: "/screenshots/screenshot-desktop.jpg",
            sizes: "1920x1080",
            type: "image/jpeg",
            form_factor: "wide",
            label: "Dashboard Desktop - Painel Sucena",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/dashboard",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Presença",
            short_name: "Presença",
            url: "/presenca",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Equipamentos",
            short_name: "Equipamentos",
            url: "/entrada-saida-equipamentos",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Desvios",
            short_name: "Desvios",
            url: "/desvios",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2,webp}"],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "next-themes"],
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    // Browsers-alvo (esnext) já suportam <link rel="modulepreload"> nativamente,
    // então podemos economizar o polyfill (~2KB gzip + parse cost).
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // framer-motion é pesado — separado do UI para carregar só quando necessário
          'vendor-motion': ['framer-motion'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          'vendor-utils': ['@tanstack/react-query', '@tanstack/query-core', 'date-fns', 'zod'],
          // Libs pesadas isoladas — carregam somente com a página que as usa
          // e ficam em cache compartilhado entre rotas.
          'vendor-excel': ['exceljs'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-pdfjs': ['pdfjs-dist'],
          'vendor-pptx': ['pptxgenjs'],
          'vendor-zip': ['jszip'],
          'vendor-gif': ['modern-gif'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-carousel': ['embla-carousel-react'],
        },
      },
    },
    sourcemap: false,
    assetsInlineLimit: 200000,
  },
}));

