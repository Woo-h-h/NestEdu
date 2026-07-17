import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
      //"@typescript-eslint": tseslint,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }
      ],
      "no-console": "off",
      "no-new-native-nonconstructor": "off",
      "multiline-ternary": ["error", "always-multiline"],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/no-require-imports": 0,
      "@typescript-eslint/semi": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "multiline-ternary": "off"
    }
  }
);
