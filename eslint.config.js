import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.wrangler/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // La propia config de ESLint no está en el tsconfig del proyecto.
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      // Muchas implementaciones cumplen una interfaz async sin necesitar await
      // (la caché en memoria, el modo fixtures). La regla solo haría ruido.
      '@typescript-eslint/require-await': 'off',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['server/**/*.ts', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'tools/**/*.{ts,js,mjs}'],
    languageOptions: { globals: globals.node },
  },

  {
    // El arranque del servidor sí puede escribir en consola.
    files: ['server/adapters/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    // Estos archivos no exportan componentes: la regla de fast refresh no aplica.
    files: ['src/i18n/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
