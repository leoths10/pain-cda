import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Configuration Vite pour le frontend React
 * 
 * Vite est le bundler/dev server utilisé pour :
 * - Le développement avec Hot Module Replacement (HMR)
 * - Le build de production optimisé
 * - La gestion des imports et transformations
 * 
 * Documentation : https://vite.dev/config/
 */

/**
 * URL cible du backend Laravel pour le proxy
 * Permet d'éviter les problèmes CORS en développement
 * Utilise la variable d'environnement VITE_API_PROXY si définie
 */
const backendProxyTarget = process.env.VITE_API_PROXY ?? 'http://10.37.44.221:8009'

export default defineConfig({
  // Plugin React : Active le support JSX/TSX et Fast Refresh
  plugins: [react()],

  build: {
    // esbuild est ~20× plus rapide que terser pour la minification
    minify: 'esbuild',
    // Active le cache de build (Vite 5+)
    cache: true,
    // Limite la taille des chunks inlinés pour éviter les re-build inutiles
    assetsInlineLimit: 4096,
    // Désactive la génération de sourcemaps en production (réduit le temps)
    sourcemap: false,
    rollupOptions: {
      output: {
        // Sépare les vendors dans un chunk dédié pour mieux profiter du cache navigateur
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  
  server: {
    /**
     * host: '0.0.0.0' permet d'accéder au serveur de dev depuis :
     * - L'adresse IP de la machine (10.37.44.221:5179 recommandé)
     * - localhost (machine locale uniquement)
     * Utile pour tester sur mobile ou depuis un autre ordinateur du réseau
     */
    host: '0.0.0.0',
    
    /**
     * Proxy pour rediriger les requêtes /api vers le backend Laravel
     * Évite les problèmes CORS en développement en faisant transiter
     * les requêtes API par le serveur Vite
     * 
     * Exemple : fetch('/api/message') → http://10.37.44.221:8009/api/message
     */
    proxy: {
      '/api': {
        target: backendProxyTarget,
        changeOrigin: true, // Modifie l'en-tête Origin pour correspondre à la cible
      },
    },
  },
})
