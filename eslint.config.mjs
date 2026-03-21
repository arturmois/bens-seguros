import { baseConfig } from "@config/eslint-config";

export default [
  baseConfig,
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".next/",
      "generated/",
      "_reference/",
    ],
  },
];
