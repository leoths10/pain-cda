import { defineConfig } from 'vitest/config'

// Tests de logique pure : environnement Node (pas de DOM nécessaire pour les
// utilitaires de utils/). Les tests de composants viendront en étape 2 avec
// l'environnement jsdom + Testing Library.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
