module.exports = {
  root: true,
  env: {
    browser: false,
    node: true,
    es2021: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'sort-imports': 'error',
    'no-empty': 'off',
    curly: 'error',
    semi: 'error',
  },
};
