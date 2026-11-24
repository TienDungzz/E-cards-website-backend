import fs from 'node:fs';

const configSource = process.env.PROJECT_STANDARDS_CONFIG || new URL('./project-standards.json', import.meta.url);
const standards = JSON.parse(fs.readFileSync(configSource, 'utf8').replace(/^\uFEFF/, ''));

export function createCodeRules(settings = {}) {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('code must be an object.');
  }
  const max = settings.maxFunctionLines === undefined ? 60 : settings.maxFunctionLines;
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error('code.maxFunctionLines must be a positive safe integer.');
  }
  return {
    'max-lines-per-function': ['error', { max, skipBlankLines: false, skipComments: false, IIFEs: true }]
  };
}

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.next/**', '**/.nuxt/**', '.npm-cache/**'] },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    linterOptions: { noInlineConfig: true },
    rules: {
      ...createCodeRules(standards.code),
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      indent: ['error', 2, { SwitchCase: 1 }],
      'comma-spacing': ['error', { before: false, after: true }],
      'array-bracket-spacing': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'keyword-spacing': ['error', { before: true, after: true }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'arrow-spacing': ['error', { before: true, after: true }],
      'space-before-blocks': ['error', 'always'],
      'space-infix-ops': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
