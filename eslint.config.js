const js = require("@eslint/js");
const globals = require("globals");
const eslintPluginPrettier = require("eslint-plugin-prettier/recommended");

module.exports = [
  {
    ignores: ["node_modules/", "coverage/"],
  },
  js.configs.recommended,
  eslintPluginPrettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
      "no-use-before-define": ["error", { functions: false }],
      "eqeqeq": "error",
      "curly": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-throw-literal": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "error",
      "no-unmodified-loop-condition": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "prefer-promise-reject-errors": "error",
      "require-await": "error",
      "no-param-reassign": "error",
      "no-else-return": "error",
      "consistent-return": "error",
      "default-case": "error",
      "dot-notation": "error",
      "no-multi-assign": "error",
      "no-nested-ternary": "error",
      "no-new-wrappers": "error",
      "no-lonely-if": "error",
      "no-unneeded-ternary": "error",
      "operator-assignment": "error",
      "prefer-object-spread": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "prefer-arrow-callback": "error",
      "no-duplicate-imports": "error",
      "no-shadow": "error",
    },
  },
  {
    files: ["__tests__/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
