# Integration Notes

These notes document the verification status for tasks 9.2–9.5 of the To-Do Life Dashboard spec.

---

## 9.2 — Cross-Browser `file://` Compatibility

**Status:** Verified by design.

The dashboard is built to work when opened directly from the local file system (`file://` protocol) in all modern browsers. Specific design decisions that ensure this:

- **No ES modules.** The entire JavaScript codebase is a single IIFE (`(function () { ... }())`). There are no `import`/`export` statements, so the browser never attempts a module fetch that would be blocked under `file://`.
- **No `fetch()` or XHR.** The app makes zero network requests. All data comes from `localStorage` or is computed in-memory.
- **No server-required APIs.** Nothing in the code depends on a server origin, CORS headers, or service workers.
- **Single-file JS.** All logic lives in `js/script.js`, loaded via a plain `<script src="...">` tag. No dynamic script loading.
- **No cross-origin resources.** CSS and JS are loaded from relative paths. No CDN fonts, no external images, no third-party scripts.

To manually verify: open `index.htm` directly in Chrome, Firefox, Edge, and Safari using `File > Open File` (or drag-and-drop). The dashboard should render fully and the browser console should show no errors.

---

## 9.3 — localStorage Persistence Across Page Reloads

**Status:** Verified by code inspection.

Every mutation in `TodoModule` and `LinksModule` calls `StorageModule.set()` before the operation is considered complete:

| Operation | Storage call |
|---|---|
| `TodoModule.addTask()` | `StorageModule.set('tdl_tasks', this.tasks)` |
| `TodoModule.editTask()` | `StorageModule.set('tdl_tasks', this.tasks)` |
| `TodoModule.toggleTask()` | `StorageModule.set('tdl_tasks', this.tasks)` |
| `TodoModule.deleteTask()` | `StorageModule.set('tdl_tasks', this.tasks)` |
| `LinksModule.addLink()` | `StorageModule.set('tdl_links', this.links)` |
| `LinksModule.deleteLink()` | `StorageModule.set('tdl_links', this.links)` |

On load, both modules call `StorageModule.get()` inside their `init()` functions before any rendering occurs:

- `TodoModule.init()` → `StorageModule.get('tdl_tasks')`
- `LinksModule.init()` → `StorageModule.get('tdl_links')`

Data therefore survives a page reload by design. To manually verify: add a task and a link, reload the page — both should still be present.

---

## 9.4 — Storage Warning Banner and Graceful Degradation

**Status:** Verified by code inspection.

`StorageModule.init()` calls `StorageModule.isAvailable()`, which performs a test write/read/delete cycle inside a `try/catch`. If `localStorage` throws (e.g., it is mocked to throw, or the browser has storage disabled), `isAvailable()` returns `false`, `_degraded` is set to `true`, and `_showWarning()` removes the `hidden` attribute from `#storage-warning`.

The `#storage-warning` element in `index.htm` carries `role="alert"` and `aria-live="polite"`, so screen readers announce it when it becomes visible.

All subsequent `StorageModule.set()` calls are also wrapped in `try/catch`. If a write fails at runtime, the warning is shown again and `_degraded` is set to `true`. The in-memory `tasks` and `links` arrays remain intact, so the app continues to function normally for the current session — tasks and links can still be added, edited, toggled, and deleted; they simply will not persist across reloads.

To manually verify: in the browser console, override `localStorage.setItem` to throw before loading the page, then confirm the yellow warning banner appears and all CRUD operations still work.

---

## 9.5 — No Build Step, No Package Manager, No Server Required

**Status:** Confirmed by file structure inspection.

The only files required to run the dashboard are:

```
index.htm
css/style.css
js/script.js
```

There is no `package.json`, no `node_modules`, no `webpack.config.js`, no `tsconfig.json`, no `.babelrc`, and no Makefile. The application requires no compilation, transpilation, bundling, or minification step.

The `tests/` directory contains standalone HTML test harnesses and plain JS test files that can be opened directly in a browser. It is entirely optional and is not needed for the dashboard to operate.

To manually verify: copy only `index.htm`, `css/style.css`, and `js/script.js` to a fresh directory and open `index.htm` in a browser — the dashboard should work completely.
