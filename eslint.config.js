import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import wc from 'eslint-plugin-wc'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      wc,
    },
    rules: {
      ...wc.configs['flat/best-practice'].rules,
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
    ignores: ['dist', 'coverage', 'node_modules'],
  },
]
