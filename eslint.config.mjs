import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './packages/*/tsconfig.json', './plugins/*/tsconfig.json', './apps/*/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@saas/core/src/*'],
              message: 'Do not import internal core modules. Import from @saas/core instead.'
            },
            {
              group: ['@saas/plugins/*'],
              message: 'Plugins cannot cross-import each other.'
            }
          ]
        }
      ]
    },
  },
);
