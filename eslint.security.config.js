// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

import security from "eslint-plugin-security";
import globals from "globals";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    plugins: {
      security,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      ...security.configs.recommended.rules,
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-new-buffer": "error",
      "security/detect-bidi-characters": "error",
    },
  },
  {
    ignores: [
      "node_modules/",
      "target/",
      "cdk.out/",
      "cdk-spreadsheets.out/",
      "packages/",
      "packages-archive/",
      "*.min.js",
      "**/*.test.js",
      "**/*.spec.js",
      "behaviour-tests/",
      "scripts/",
      "eslint.security.config.js",
      "**/lib/toml-parser.js",
    ],
  },
];
