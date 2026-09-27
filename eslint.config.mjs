import { defineConfig, globalIgnores } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";
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
    plugins: { "unused-imports": unusedImports },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      /**
       * ENCENDIDA, y no se vuelve a apagar: los imports sin usar se limpiaron todos
       * (241) y esta regla es lo unico que impide que vuelvan. `no-unused-vars` sigue
       * apagada porque aun quedan 195 variables sin usar, que necesitan criterio una por
       * una (hay llamadas cuyo resultado se descarta y borrarlas cambiaria el
       * comportamiento); esta solo mira imports, que es el caso seguro y ya esta en cero.
       *
       * La arregla `eslint --fix`.
       */
      "unused-imports/no-unused-imports": "error",
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
      /** ENCENDIDA: quedaban dos y se arreglaron. La arregla `eslint --fix`. */
      "prefer-const": "error",
    },
  },
]);

export default eslintConfig;
