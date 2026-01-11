# Repository Guidelines

## Project Structure & Module Organization
- **Frontend-only** Vue 3 + TypeScript application built with Vite 5.0+
- Source code lives under `src/` with `api/`, `components/`, `types/`, and `utils/` directories
- Entry points: `src/main.ts` (app bootstrap), `src/App.vue` (root component)
- Build output: `dist/` directory (generated)
- Runtime config: API proxy configured in `vite.config.ts` to forward `/api` requests to `http://localhost:8080`

## Build, Test, and Development Commands
- **Install dependencies**: `npm install`
- **Development server**: `npm run dev` starts Vite dev server on `http://localhost:3000`
- **Production build**: `npm run build` runs `vue-tsc` (type check) then `vite build`
- **Preview build**: `npm run preview` serves production build locally
- **No tests configured** - This project has no test framework set up
- **No linting configured** - This project has no ESLint or Prettier configured

## Coding Style & Naming Conventions

### TypeScript / Vue
- **Indentation**: 2 spaces (strict)
- **Component filenames**: PascalCase (e.g., `ChatArea.vue`, `KnowledgePanel.vue`)
- **Variables/props**: camelCase
- **Component definition**: Use `<script setup lang="ts">` exclusively (Composition API)
- **Type imports**: Use `import type { }` for type-only imports
- **Path aliases**: Use `@/` prefix for src imports (configured in `vite.config.ts`)

### Vue SFC Structure
```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
  // Imports first
  // Props with defineProps
  // Emits with defineEmits
  // Refs/computed
  // Methods
  // Watchers/lifecycle hooks
</script>

<style scoped>
  /* Scoped component styles */
</style>
```

### CSS Styling
- Use **CSS variables** (defined in `src/style.css`) for colors, fonts, spacing
- **Scoped styles** in components (`<style scoped>`)
- **`@/style.css`** is the global stylesheet with CSS variables and Element Plus overrides
- For Element Plus deep selectors: use `:deep(.class-name)` syntax
- Custom animations: define in global `style.css` or component-scoped styles

### Type Definitions
- All shared types live in `src/types/index.ts`
- Export interfaces with PascalCase (e.g., `KnowledgeBase`, `FileItem`, `Message`)
- Use union types for string literals (e.g., `status: 'uploaded' | 'parsing' | 'ready' | 'failed'`)

### API Layer
- API functions organized in `src/api/index.ts`
- Use `axios.create()` with base URL and response interceptors
- API methods grouped by domain (e.g., `knowledgeApi`, `chatApi`)
- Return typed Promises (import types from `@/types`)
- Error handling: `ElMessage.error()` for user feedback

### Utilities
- Helper functions in `src/utils/format.ts`
- Export as named functions (e.g., `formatFileSize`, `formatTime`, `generateId`)
- Keep utilities pure and side-effect free

### Imports & Dependencies
- Import Vue composables from `vue`: `ref`, `computed`, `watch`, `onMounted`, `nextTick`
- Import Element Plus components directly: `ElMessage`, `ElButton`, `ElTag`, etc.
- Third-party libs: `axios`, `markdown-it`, `highlight.js`
- Import types with `import type { }` syntax when only using types

### Error Handling
- Use `try-catch` for async operations
- Log errors with `console.error()` for debugging
- Show user-friendly messages with `ElMessage.error()` or `ElMessage.warning()`
- For destructive actions, use `ElMessageBox.confirm()` with user confirmation

### Component Communication
- **Props**: Type-props via `defineProps<{ }>()`
- **Events**: Typed emits via `defineEmits<{ 'event-name': [payloadType] }>()`
- **Expose**: Use `defineExpose()` when parent needs access to child component methods

### Code Patterns
- **Computed properties**: Use for derived state
- **Watchers**: Use `watch()` for side effects, `watchEffect()` for auto-tracking
- **Refs**: Use `ref<T>()` for reactive primitives, `reactive()` for objects
- **Event handlers**: Bind with `@click="handleMethod"`, `@change="handleChange"`
- **v-model**: Use for two-way binding (forms, inputs)

## Configuration & Security Notes
- **API proxy**: `/api` requests proxy to `http://localhost:8080` in `vite.config.ts`
- **TypeScript strict mode**: Enabled (`strict: true` in `tsconfig.json`)
- **No environment variables configured** - If adding secrets, use `.env.local` (gitignored)
- **No authentication configured** - This is a demo/frontend-only project
