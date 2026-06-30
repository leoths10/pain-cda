import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ── TypeScript + React (sources principales) ────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // PascalCase et _underscore ignorés (composants, types exportés, args volontairement inutilisés).
      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
      }],
      'no-unused-vars': 'off',
      // L'arbre JSON VTOM (xmltodict) est intrinsèquement dynamique : `any` reste pragmatique.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Les contextes co-localisent Provider + hook par convention React. Le HMR
  // tolère sans problème — on désactive l'avertissement.
  {
    files: ['src/contexts/**/*.tsx', 'src/components/vtom/SousProgrammesModal.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // ── JS hors src (vite.config, etc.) ──────────────────────────────────────────
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
  },
])
