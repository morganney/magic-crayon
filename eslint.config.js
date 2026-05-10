import js from '@eslint/js'
import css from '@eslint/css'
import html from '@html-eslint/eslint-plugin'
import tseslint from 'typescript-eslint'
import wc from 'eslint-plugin-wc'
import unicorn from 'eslint-plugin-unicorn'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'

const htmlA11yRules = {
  '@html-eslint/no-abstract-roles': 'error',
  '@html-eslint/no-accesskey-attrs': 'error',
  '@html-eslint/no-aria-hidden-body': 'error',
  '@html-eslint/no-aria-hidden-on-focusable': 'error',
  '@html-eslint/no-empty-headings': 'error',
  '@html-eslint/no-heading-inside-button': 'error',
  '@html-eslint/no-invalid-role': 'error',
  '@html-eslint/no-non-scalable-viewport': 'error',
  '@html-eslint/no-positive-tabindex': 'error',
  '@html-eslint/no-redundant-role': 'error',
  '@html-eslint/no-skip-heading-levels': 'error',
  '@html-eslint/require-form-method': 'error',
  '@html-eslint/require-frame-title': 'error',
  '@html-eslint/require-img-alt': 'error',
  '@html-eslint/require-input-label': 'error',
  '@html-eslint/require-meta-viewport': 'error',
}

export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
  },
  {
    files: ['**/*.css'],
    language: 'css/css',
    ...css.configs.recommended,
    rules: {
      ...css.configs.recommended.rules,
      'css/use-baseline': 'off',
    },
  },
  {
    files: ['src/*.html'],
    ...html.configs['flat/recommended'],
    rules: {
      ...html.configs['flat/recommended'].rules,
      ...htmlA11yRules,
      '@html-eslint/attrs-newline': 'off',
      '@html-eslint/indent': ['error', 2],
      '@html-eslint/no-extra-spacing-attrs': 'off',
      '@html-eslint/require-closing-tags': ['error', { selfClosing: 'always' }],
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        node: true,
        typescript: true,
      },
    },
    rules: {
      'import/no-cycle': [
        'error',
        {
          ignoreExternal: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      wc,
      unicorn,
    },
    rules: {
      ...wc.configs['flat/best-practice'].rules,
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: [
      'dist',
      'dist-demo',
      'coverage',
      'node_modules',
      'storybook-static',
      '*.tgz',
    ],
  },
]
