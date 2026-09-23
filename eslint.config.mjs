import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // A one-off esbuild bundle of the migration script that was committed to
    // the repo root. It is ~400KB of generated vendor code and it produced
    // every single one of the 408 problems `npm run lint` used to report,
    // which buried any real finding in src/ and made the command useless.
    // Nothing imports it; see DEVELOPMENT_SUMMARY.md.
    "migrate-test.js",
  ]),
]);

export default eslintConfig;
