// @ts-check

const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const unusedImports = require('eslint-plugin-unused-imports');
const prettier = require('eslint-plugin-prettier');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'dist/**',
      'build/**',
      'lib/**',
      'cjs/**',
      'es/**',
      'umd/**',
      'node_modules/**',
      '*.d.ts',
      'coverage/**',
      '.vscode/**',
      '.idea/**',
      '**/*.min.js',
      '**/*.bundle.js',
      'flow-typed/**',
      'recoil_devtools_ext/**',
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        MessageEvent: 'readonly',
        HTMLScriptElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        SVGSVGElement: 'readonly',
        Element: 'readonly',
        EventListenerOrEventListenerObject: 'readonly',
        Window: 'readonly',
        NodeJS: 'readonly',
        React: 'readonly',
        performance: 'readonly',
        history: 'readonly',
        __DEV__: 'readonly',

        // Chrome extension APIs
        chrome: 'readonly',

        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      react: react,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
      prettier: prettier,
    },
    rules: {
      // Basic ESLint rules
      'no-unused-vars': 'warn', // Handled by TypeScript
      'no-undef': 'error',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',

      // TypeScript rules (basic set)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-as-const': 'error',

      // React rules (basic set)
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Prettier
      'prettier/prettier': 'error',

      // Unused imports
      'unused-imports/no-unused-imports': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
