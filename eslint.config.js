// @ts-check

import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['src/routeTree.gen.ts'],
  },
  {
    name: 'start-bare/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
  },
  {
    name: 'start-bare/deepkit-value-imports',
    files: ['server/**/*.ts'],
    rules: {
      // Deepkit's DI and RPC depend on runtime type metadata emitted by @deepkit/type-compiler.
      // `import type` erases imports from the JS output, which removes the runtime references
      // that Deepkit needs for constructor injection and type serialization.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
]
