import js from "@eslint/js";
import globals from "globals";
export default [
  {
    ignores: ["dist/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-constant-binary-expression": "error",
    },
  },
  {
    files: [
      "content/**/*.js",
      "src/learning/**/*.js",
      "src/persistence/**/*.js",
      "src/tools/**/*.js",
      "src/reports/**/*.js",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        "document",
        "window",
        "localStorage",
        "sessionStorage",
        "location",
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/ui/**", "**/main.js"],
              message: "Content and domain logic must not depend on page rendering.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["content/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/src/**"],
              message: "Learning content must not import application code.",
            },
          ],
        },
      ],
    },
  },
];
