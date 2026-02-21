---
name: ui-design
description: React UI design principles and conventions. Load this skill when building or modifying any user interface. Covers component design, application type detection, Mantine (business apps) and Tailwind (consumer apps), accessibility, responsiveness, and state management patterns.
license: MIT
compatibility: opencode
---

## Determine application type first

Before writing any UI code, determine whether this is a **business-facing** or **consumer-facing** application. This determines the entire styling and component approach.

**Business-facing** (internal tools, dashboards, admin panels, B2B SaaS, data-heavy interfaces):
- Use **Mantine** as the component library
- Style using Mantine's styling system (`styles`, `classNames`, `sx`, CSS Modules with Mantine tokens)
- Do not introduce Tailwind

**Consumer-facing** (marketing sites, consumer products, public-facing apps, brand-driven experiences):
- Use **Tailwind CSS** for all styling
- Use **Radix UI** for unstyled accessible primitives (dialogs, dropdowns, tooltips, etc.)
- Do not introduce Mantine

Do not mix the two systems. Pick one per application and be consistent.

---

## Component design principles

**One component, one responsibility.** A component should do one thing at one level of abstraction. If a component manages data fetching, layout, and user interaction simultaneously, break it apart.

**Separate concerns between container and presentational components.** Data fetching, state management, and business logic live in container components or hooks. Presentational components receive data and callbacks via props and render UI. Presentational components are easy to test, easy to reuse, and easy to reason about.

**Props are the interface.** Design component props the way you design a function signature — with intention. Required props should be necessary. Optional props should have sensible defaults. Avoid prop bags (`options: {}`) that obscure what a component actually needs.

**Prefer composition over configuration.** Rather than a single component with many boolean flags (`showHeader`, `compact`, `withBorder`), prefer composing smaller components together. Flags are a sign a component is doing too much.

```tsx
// Avoid
<DataTable showFooter compact withBorder headerAction={<Button />} />

// Prefer
<DataTable>
  <DataTable.Header action={<Button />} />
  <DataTable.Body compact />
  <DataTable.Footer />
</DataTable>
```

**Never put logic in JSX.** Extract conditionals and transformations into variables or functions before the return statement. JSX should read like a description of the UI, not a program.

---

## Business apps: Mantine conventions

Use Mantine's component library as-is before building custom components. Reach for `Table`, `DataTable` (mantine-datatable), `Modal`, `Drawer`, `Select`, `MultiSelect`, `DatePicker`, `Notifications`, `Menu`, `Tabs` before writing your own.

Style with Mantine's system in this order of preference:
1. `classNames` prop with CSS Modules for component-level overrides
2. Mantine CSS variables and tokens for consistency with the theme
3. `styles` prop for one-off inline style needs
4. Never use arbitrary hex values or hardcoded spacing — use theme tokens

```tsx
// Good — uses theme tokens
<Box p="md" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>

// Bad — hardcoded values
<Box style={{ padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
```

Define the theme in one place. Never override Mantine defaults ad hoc in individual components — extend the theme centrally.

Forms use `@mantine/form`. Validate on submit by default, with field-level validation on change after the first submit attempt.

---

## Consumer apps: Tailwind conventions

Use Tailwind utility classes exclusively. Do not write custom CSS unless absolutely necessary (complex animations, third-party overrides).

Use Radix UI primitives for interactive components that require accessibility: `Dialog`, `DropdownMenu`, `Select`, `Tooltip`, `Popover`, `Tabs`, `Accordion`. Style them with Tailwind `className` props.

Establish a design token vocabulary in `tailwind.config.ts` upfront — brand colours, spacing scale, typography scale. Use these tokens throughout. Do not use arbitrary values (`w-[347px]`) except for one-off pixel-perfect requirements.

```tsx
// Good — uses design tokens
<button className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium">

// Avoid — arbitrary values
<button className="bg-[#4F46E5] w-[120px]">
```

Organise Tailwind classes in a consistent order: layout → sizing → spacing → typography → colour → border → effects. Use a Prettier plugin (`prettier-plugin-tailwindcss`) to enforce this automatically.

---

## Accessibility

Accessibility is not optional. Every interactive element must be keyboard navigable and screen reader compatible.

- All images have meaningful `alt` text. Decorative images use `alt=""`.
- Form inputs have associated labels — use `htmlFor` / `id` pairing or wrap the input in the label.
- Interactive elements that are not native `<button>` or `<a>` must have `role` and `aria-*` attributes.
- Colour is never the sole means of conveying information.
- Focus states are always visible — never `outline: none` without a custom focus style.
- Use semantic HTML. `<button>` for actions, `<a>` for navigation, `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>` for structure.

When using Mantine, accessibility is largely handled by the library. When using Radix, the primitives are accessible by default — do not override their ARIA attributes without understanding the implications.

---

## Responsiveness

Design for mobile first. Write base styles for small screens and add breakpoint overrides for larger screens.

In Mantine: use responsive props (`p={{ base: 'sm', md: 'lg' }}`) and `useMediaQuery` hook.

In Tailwind: use mobile-first breakpoint prefixes (`sm:`, `md:`, `lg:`).

Do not hardcode widths for content containers. Use `max-w-*` with `mx-auto` in Tailwind or Mantine's `Container` component.

---

## State management

Local UI state (open/closed, form values, selected tab) lives in `useState` or `useReducer` in the component that owns it.

Shared UI state (current user, theme, notifications, permissions) lives in React context or a lightweight global store (Zustand). Use context for state that changes infrequently. Use Zustand for state that changes often or is accessed by many components.

Server state lives in a data-fetching library — use React Query (`@tanstack/react-query`). Do not replicate server state into `useState`. React Query is the cache.

Do not reach for Redux. It is not justified for new projects.

---

## Loading and error states

Every data-dependent component must handle three states: loading, error, and success. There is no fourth option.

Use skeleton loaders (Mantine's `Skeleton`, or a Tailwind pulse animation) for loading states — not spinners in the middle of content that already has a known shape.

Error states must be actionable. "Something went wrong" with a retry button beats a raw error message.

Do not show empty states and loading states at the same time.

---

## Performance

Lazy load routes using `React.lazy` and `Suspense`. Do not bundle the entire application into one chunk.

Memoize with `useMemo` and `useCallback` only when there is a measured performance problem. Premature memoization adds noise and obscures intent.

Virtualise long lists (100+ rows) using `@tanstack/react-virtual` or `mantine-datatable`'s built-in virtualisation.

Images use correct dimensions, modern formats (WebP, AVIF), and lazy loading (`loading="lazy"`) unless above the fold.

---

## Screenshots

After completing any UI changes, take screenshots of the affected routes and attach them to the task log. This is a required part of the definition of done for all frontend tasks.

### Setup

If `@playwright/test` is not already a dev dependency in the project, install it:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium --with-deps
```

### Workflow

1. **Start the dev server** if it is not already running. Use the project's `dev` script:

   ```bash
   pnpm dev &
   DEV_PID=$!
   ```

   Wait for the server to be ready before proceeding. Poll the base URL until it responds or time out after 30 seconds.

2. **Identify the routes affected by your changes.** Screenshot every route you modified, created, or that is visually adjacent to the changes (e.g. a list view when you changed a detail view).

3. **Take screenshots** using a Playwright script. Save screenshots to `agent-logs/screenshots/` with descriptive filenames:

   ```bash
   pnpm exec playwright screenshot \
     --browser chromium \
     http://localhost:PORT/your-route \
     agent-logs/screenshots/YYYY-MM-DD_task-name_route-name.png
   ```

   For routes that require authentication or specific state, write a minimal Playwright script inline:

   ```bash
   pnpm exec node --input-type=module <<'EOF'
   import { chromium } from '@playwright/test'
   const browser = await chromium.launch()
   const page = await browser.newPage()
   await page.setViewportSize({ width: 1280, height: 800 })
   // set up any required state here (cookies, localStorage, etc.)
   await page.goto('http://localhost:PORT/your-route')
   await page.waitForLoadState('networkidle')
   await page.screenshot({ path: 'agent-logs/screenshots/YYYY-MM-DD_task-name_route-name.png', fullPage: true })
   await browser.close()
   EOF
   ```

4. **Stop the dev server** if you started it:

   ```bash
   kill $DEV_PID 2>/dev/null
   ```

5. **Reference the screenshots in the task log.** Add an image reference to the markdown log file for each screenshot taken:

   ```markdown
   ## Screenshots

   ![Route name](./screenshots/YYYY-MM-DD_task-name_route-name.png)
   ```

### Naming convention

Screenshots follow the same date and task name as the log file, with the route appended:

```
logs/
  2024-03-15_add-user-profile.md
  screenshots/
    2024-03-15_add-user-profile_profile-page.png
    2024-03-15_add-user-profile_settings-page.png
```

### What to screenshot

- Every route you created
- Every route whose layout, components, or data display you modified
- Both desktop (1280×800) and mobile (390×844) viewports if the changes affect responsive behaviour

Do not screenshot routes you did not touch.