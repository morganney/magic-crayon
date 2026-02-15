import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import wc from 'eslint-plugin-wc'
import unicorn from 'eslint-plugin-unicorn'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
    ignores: ['dist', 'coverage', 'node_modules', 'storybook-static', '*.tgz'],
  },
]
