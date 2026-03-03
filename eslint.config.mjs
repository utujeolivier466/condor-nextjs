import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  // Relax some rules for faster development while maintaining code quality
  {
    rules: {
      "react/no-unescaped-entities": "warn", // Changed from error to warning for quotes/apostrophes in JSX
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error for any types
      "@typescript-eslint/no-unused-vars": "warn", // Warn for unused variables
      "react-hooks/exhaustive-deps": "warn", // Warn for missing dependencies
    },
  },
];

export default eslintConfig;
