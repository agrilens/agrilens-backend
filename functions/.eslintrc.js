module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "no-unused-vars": ["warn"],
    "object-curly-spacing": ["off"],
    "require-jsdoc": "off",
    "quotes": ["error", "double", { allowTemplateLiterals: true }],
    "new-cap": ["error", { "capIsNew": false }],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
