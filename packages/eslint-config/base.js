import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export const config = defineConfig(
	{
		ignores: [
			"**/.next/**",
			"**/coverage/**",
			"**/dist/**",
			"**/node_modules/**",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked.map((eslintConfig) => ({
		...eslintConfig,
		files: ["**/*.{ts,tsx}"],
	})),
	eslintConfigPrettier,
	{
		files: ["**/*.{js,mjs}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: process.cwd(),
			},
		},
		plugins: {
			"import-x": importPlugin,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports" },
			],
			"@typescript-eslint/no-confusing-void-expression": [
				"error",
				{ ignoreArrowShorthand: true },
			],
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"import-x/first": "error",
			"import-x/newline-after-import": "error",
			"import-x/no-duplicates": "error",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
		},
	},
	{
		files: ["**/*.config.{js,mjs,ts}", "**/next.config.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"react-refresh/only-export-components": "off",
		},
	},
);
