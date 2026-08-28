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
    "public/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
      // Encendida a propósito. Un hook debajo de un `return` temprano se
      // ejecuta unas veces y otras no; React lleva la cuenta por orden y en
      // cuanto el número cambia entre dos renders tumba la pantalla entera con
      // el error 310. Pasó en producción y no lo vio ni `tsc` ni `next build`:
      // es orden de ejecución, no tipos. Esta regla es lo único que lo detecta
      // antes de desplegar, así que no se vuelve a apagar.
      "react-hooks/rules-of-hooks": "error",
      "react/no-unescaped-entities": "off",
      "no-unused-disable": "off",
      "eslint-comments/no-unused-disable": "off",
      "prefer-const": "off",
    },
  },
]);

export default eslintConfig;
