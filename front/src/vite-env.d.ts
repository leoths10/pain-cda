/**
 * vite-env.d.ts - Déclarations TypeScript pour Vite
 * 
 * Ce fichier charge les types TypeScript de Vite dans le projet via une directive triple-slash.
 * Il est essentiel au bon fonctionnement de TypeScript avec Vite.
 * 
 * Fonctionnalités activées :
 * 
 * 1. **Import d'assets**
 *    TypeScript comprend les imports de fichiers non-TypeScript :
 *    - Images : .png, .jpg, .svg, .webp → string (URL)
 *    - Styles : .css, .scss → objet de classes CSS
 *    - Data : .json → objet typé
 *    
 *    Exemple :
 *    ```tsx
 *    import logo from './logo.png'        // string
 *    import data from './plan-data.json'  // object
 *    ```
 * 
 * 2. **Variables d'environnement (import.meta.env)**
 *    Accès typé aux variables d'environnement Vite :
 *    - VITE_* : Variables personnalisées définies dans .env
 *    - MODE : 'development' | 'production'
 *    - DEV : boolean (true en dev)
 *    - PROD : boolean (true en prod)
 *    - SSR : boolean (Server-Side Rendering)
 *    
 *    Exemple :
 *    ```tsx
 *    const apiUrl = import.meta.env.VITE_API_URL  // ✅ Autocomplétion
 *    const isDev = import.meta.env.DEV             // ✅ Type: boolean
 *    ```
 * 
 * 3. **Hot Module Replacement (HMR)**
 *    API pour le rechargement à chaud en développement :
 *    
 *    Exemple :
 *    ```tsx
 *    if (import.meta.hot) {
 *      import.meta.hot.accept()  // ✅ TypeScript comprend l'API HMR
 *    }
 *    ```
 * 
 * ⚠️ **Important** :
 * - Ne pas supprimer ce fichier
 * - Ne pas modifier la directive triple-slash
 * - Sans ce fichier, TypeScript génèrera des erreurs sur tous les imports d'assets
 * 
 * @see https://vitejs.dev/guide/features.html#typescript
 */
/// <reference types="vite/client" />
