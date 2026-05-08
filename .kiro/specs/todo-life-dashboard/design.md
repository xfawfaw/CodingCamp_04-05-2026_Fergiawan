# Design Document: To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a single-page, client-side web application delivered as three static files: `index.htm`, `css/style.css`, and `js/script.js`. It requires no build step, no package manager, and no server. All state is persisted to `localStorage`.

The page is divided into four independent widgets:

| Widget | Purpose |
|---|---|
| Clock & Greeting | Live time/date display and time-of-day salutation |
| Focus Timer | 25-minute Pomodoro countdown |
| To-Do List | CRUD task management with completion tracking |
| Quick Links | User-defined shortcut buttons to external URLs |

Each widget is self-contained in terms of DOM, logic, and storage key. They share only the top-level initialization call and the storage utility module.

---

## Architecture

The application follows a **module pattern** using plain JavaScript objects/closures — no ES modules (to support `file://` protocol without a server). All code lives in `js/script.js` and is wrapped in an IIFE to avoid polluting the global scope.

```
┌─────────────────────────────────────────────────────┐
│                     index.htm                       │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────┐ │
│  │  Clock   │  │  Focus   │  │  Todo  │  │ Quick │ │
│  │Greeting  │  │  Timer   │  │  List  │  │ Links │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └───┬───┘ │
│       │             │             │            │     │
│  ┌────▼─────────────▼─────────────▼────────────▼───┐ │
│  │              js/script.js                       │ │
│  │  ClockModule | TimerModule | TodoModule |        │ │
│  │  LinksModule | StorageModule | App.init()        │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                            │
│  ┌──────────────────────▼──────────────────────────┐ │
│  │              localStorage                        │ │
│  │  "tdl_tasks"  |  "tdl_links"                    │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **No ES modules**: `file://` protocol blocks ES module imports in most browsers. All code is in one IIFE.
- **No frameworks**: Requirement 10 mandates plain HTML/CSS/JS.
- **Module pattern via closures**: Each widget exposes only an `init()` function and any public methods needed by other modules.
- **Event delegation**: The Todo List and Quick Links use a single event listener on the container element rather than per-item listeners, to handle dynamically added items efficiently.
- **`setInterval` for clock**: 1-second interval drives both the clock update and the greeting boundary check.
- **`setInterval` for timer**: A separate 1-second interval drives the focus timer countdown; it is created on Start and cleared on Stop/Reset.

---

## Components and Interfaces

### StorageModule

Wraps `localStorage` with error handling. All reads/writes go through this module.

```
StorageModule
  .get(key: string) → any | null
  .set(key: string, value: any) → void
  .isAvailable() → boolean
```

- `get` parses JSON; returns `null` on parse error or missing key.
- `set` serializes to JSON; catches `QuotaExceededError` and other exceptions.
- On any error, sets an internal `degraded` flag and emits a warning banner (non-blocking).

Storage keys:
- `"tdl_tasks"` — array of Task objects
- `"tdl_links"` — array of Link objects

---

### ClockModule

```
ClockModule
  .init(containerEl: HTMLElement) → void
```

- Reads `Date` every second via `setInterval`.
- Updates two child elements: `#clock-time` (HH:MM:SS) and `#clock-date` (human-readable).
- If `new Date()` throws or returns an invalid date, displays "Time unavailable".
- Delegates greeting update to `GreetingModule` on each tick.

---

### GreetingModule

```
GreetingModule
  .update(hour: number) → void
  .getGreeting(hour: number) → string
```

- `getGreeting` is a pure function mapping an hour (0–23) to a greeting string.
- `update` writes the result to `#greeting-text`.

Greeting boundaries:

| Hour range | Greeting |
|---|---|
| 05–11 | Good Morning |
| 12–17 | Good Afternoon |
| 18–20 | Good Evening |
| 21–04 | Good Night |

---

### TimerModule

```
TimerModule
  .init(containerEl: HTMLElement) → void
```

Internal state:
- `remaining: number` — seconds left (starts at 1500)
- `intervalId: number | null` — handle from `setInterval`
- `running: boolean`

Controls:
- **Start**: creates interval, sets `running = true`, disables Start button, enables Stop button.
- **Stop**: clears interval, sets `running = false`, enables Start button, disables Stop button.
- **Reset**: calls Stop, sets `remaining = 1500`, re-renders display, updates button states.

On tick: decrements `remaining`, re-renders. When `remaining === 0`: calls Stop, fires `alert()` notification.

Display format: `MM:SS` via zero-padded string formatting.

---

### TodoModule

```
TodoModule
  .init(containerEl: HTMLElement) → void
```

Internal state: `tasks: Task[]` (loaded from storage on init).

Public operations (all persist after mutation):
- `addTask(description: string)` — validates non-empty/non-whitespace, appends, persists.
- `editTask(id: string, newDescription: string)` — validates, updates, persists.
- `toggleTask(id: string)` — flips `completed`, persists.
- `deleteTask(id: string)` — removes, persists.

Rendering: `renderAll()` clears the list container and re-renders all tasks from the in-memory array. Each task item is rendered with:
- Checkbox (completion toggle)
- Label (display text, strikethrough when complete)
- Edit button → switches item to edit mode (inline input + Save/Cancel)
- Delete button

Event handling uses delegation on the list container (`ul#todo-list`).

Validation error: displayed in `#todo-error` (inline, below input), cleared on next valid submission.

---

### LinksModule

```
LinksModule
  .init(containerEl: HTMLElement) → void
```

Internal state: `links: Link[]` (loaded from storage on init).

Public operations (all persist after mutation):
- `addLink(label: string, url: string)` — validates label non-empty and URL starts with `http://` or `https://`, appends, persists.
- `deleteLink(id: string)` — removes, persists.

Rendering: `renderAll()` clears the links container and re-renders. Each link renders as a `<button>` that opens the URL in a new tab (`window.open(url, '_blank')`). If no links exist, renders a placeholder message.

Validation errors: displayed in `#links-error` (inline), identifying which field is invalid.

Event handling uses delegation on the links container.

---

### App (entry point)

```javascript
(function () {
  App.init = function () {
    StorageModule.init();
    ClockModule.init(document.getElementById('clock-widget'));
    TimerModule.init(document.getElementById('timer-widget'));
    TodoModule.init(document.getElementById('todo-widget'));
    LinksModule.init(document.getElementById('links-widget'));
  };
  document.addEventListener('DOMContentLoaded', App.init);
})();
```

---

## Data Models

### Task

```javascript
{
  id: string,          // crypto.randomUUID() or Date.now().toString()
  description: string, // non-empty, trimmed
  completed: boolean,  // false on creation
  createdAt: number    // Date.now() timestamp
}
```

Stored as a JSON array under key `"tdl_tasks"`.

### Link

```javascript
{
  id: string,   // crypto.randomUUID() or Date.now().toString()
  label: string, // non-empty, trimmed
  url: string    // must start with http:// or https://
}
```

Stored as a JSON array under key `"tdl_links"`.

### Storage Schema

```
localStorage["tdl_tasks"] = JSON.stringify(Task[])
localStorage["tdl_links"] = JSON.stringify(Link[])
```

Both keys default to `[]` when absent or unparseable.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting boundary coverage and consistency

*For any* hour value in 0–23, `GreetingModule.getGreeting(hour)` SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night" according to the defined boundaries, and calling it twice with the same hour SHALL return the same string (pure function, no side effects).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 2: Task addition grows the list

*For any* task list state and any valid (non-empty, non-whitespace) task description, calling `addTask` SHALL increase the task count by exactly one and the new task SHALL appear in the list with the submitted description.

**Validates: Requirements 4.2, 4.4**

---

### Property 3: Whitespace-only task descriptions are rejected

*For any* string composed entirely of whitespace characters, calling `addTask` SHALL reject the submission and leave the task list unchanged.

**Validates: Requirements 4.3**

---

### Property 4: Task persistence round-trip

*For any* array of tasks written to storage via `StorageModule.set`, reading them back via `StorageModule.get` SHALL return an equivalent array (same ids, descriptions, and completion states).

**Validates: Requirements 4.4, 4.5, 9.2, 9.3**

---

### Property 5: Task edit preserves identity

*For any* existing task and any valid new description, calling `editTask` SHALL update only that task's description and leave all other tasks and fields (id, completed, createdAt) unchanged.

**Validates: Requirements 5.3, 5.5**

---

### Property 6: Whitespace-only edits are rejected

*For any* existing task, calling `editTask` with a whitespace-only value SHALL leave the task's description unchanged.

**Validates: Requirements 5.4**

---

### Property 7: Completion toggle is an involution

*For any* task, toggling completion twice SHALL return the task to its original completion state (toggle is its own inverse).

**Validates: Requirements 6.2, 6.3**

---

### Property 8: Deleted task is absent

*For any* task list and any task id present in that list, calling `deleteTask(id)` SHALL result in no task with that id remaining in the list.

**Validates: Requirements 6.5**

---

### Property 9: Valid link addition grows the link list

*For any* link list state and any valid label + URL (starting with `http://` or `https://`), calling `addLink` SHALL increase the link count by exactly one and the new link SHALL appear with the submitted label and URL.

**Validates: Requirements 8.2**

---

### Property 10: Invalid URL is rejected

*For any* URL string that does not begin with `http://` or `https://`, calling `addLink` SHALL reject the submission and leave the link list unchanged.

**Validates: Requirements 8.3**

---

### Property 11: Deleted link is absent

*For any* link list and any link id present in that list, calling `deleteLink(id)` SHALL result in no link with that id remaining in the list.

**Validates: Requirements 8.5**

---

### Property 12: Timer display format

*For any* remaining-seconds value in 0–1500, the timer display string SHALL match the pattern `MM:SS` where MM and SS are zero-padded two-digit numbers and the total seconds represented equals the input value.

**Validates: Requirements 3.3**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` unavailable (private browsing, quota exceeded) | `StorageModule` catches the exception, sets `degraded = true`, shows a non-blocking warning banner (`#storage-warning`), continues with in-memory state |
| `localStorage` data is corrupt JSON | `StorageModule.get` returns `null`; callers treat `null` as empty array `[]` |
| `new Date()` returns invalid date | `ClockModule` catches the error and displays "Time unavailable" |
| Empty/whitespace task submission | `TodoModule` shows inline error in `#todo-error`, does not modify state |
| Empty/whitespace task edit | `TodoModule` discards the edit, restores original description |
| Invalid link submission (missing label, missing URL, bad URL scheme) | `LinksModule` shows inline error in `#links-error` identifying the invalid field |
| Timer reaches 00:00 | `TimerModule` stops the interval and calls `window.alert()` to notify the user |
| `crypto.randomUUID` unavailable (very old browsers) | Falls back to `Date.now().toString() + Math.random()` for id generation |

---

## Testing Strategy

### Approach

Because this is a plain-JS application with no build step, tests are written using a lightweight property-based testing library loaded via CDN (or a local copy for offline use). The recommended library is **[fast-check](https://github.com/dubzzz/fast-check)** (MIT license), which runs in the browser without a build step via its UMD bundle.

A separate `tests/index.html` test runner page loads `js/script.js` and the fast-check UMD bundle, then runs all property and unit tests, reporting results in the page.

### Unit Tests (example-based)

Focus on specific scenarios and integration points:

- Clock renders "Time unavailable" when `Date` is mocked to throw.
- Greeting displays correct string for each of the four boundary hours (5, 12, 18, 21).
- Timer starts at 25:00, counts down to 24:59 after one tick, stops at 00:00.
- Timer Start button is disabled while running; Stop button is disabled while paused.
- Todo list renders tasks loaded from storage on init.
- Quick Links renders placeholder when storage is empty.
- Storage warning banner appears when `localStorage` is mocked to throw.

### Property-Based Tests

Each property test runs a minimum of **100 iterations** via fast-check. Each test is tagged with a comment referencing the design property.

**Feature: todo-life-dashboard**

| Property | Tag | fast-check arbitraries |
|---|---|---|
| Property 1: Greeting boundary coverage and consistency | `Property 1: Greeting boundary coverage and consistency` | `fc.integer({min:0, max:23})` |
| Property 2: Task addition grows the list | `Property 2: Task addition grows the list` | `fc.array(taskArb)`, `fc.string().filter(s => s.trim().length > 0)` |
| Property 3: Whitespace-only task rejected | `Property 3: Whitespace-only task descriptions are rejected` | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| Property 4: Task persistence round-trip | `Property 4: Task persistence round-trip` | `fc.array(taskArb)` |
| Property 5: Task edit preserves identity | `Property 5: Task edit preserves identity` | `fc.array(taskArb, {minLength:1})`, `fc.string().filter(s => s.trim().length > 0)` |
| Property 6: Whitespace edit rejected | `Property 6: Whitespace-only edits are rejected` | `fc.array(taskArb, {minLength:1})`, `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| Property 7: Completion toggle involution | `Property 7: Completion toggle is an involution` | `fc.array(taskArb, {minLength:1})` |
| Property 8: Deleted task absent | `Property 8: Deleted task is absent` | `fc.array(taskArb, {minLength:1})` |
| Property 9: Valid link addition grows list | `Property 9: Valid link addition grows the link list` | `fc.array(linkArb)`, `fc.string({minLength:1})`, valid URL arb |
| Property 10: Invalid URL rejected | `Property 10: Invalid URL is rejected` | `fc.string().filter(s => !s.startsWith('http://') && !s.startsWith('https://'))` |
| Property 11: Deleted link absent | `Property 11: Deleted link is absent` | `fc.array(linkArb, {minLength:1})` |
| Property 12: Timer display format | `Property 12: Timer display format` | `fc.integer({min:0, max:1500})` |

### Integration / Smoke Tests

- Dashboard loads from `file://` in Chrome, Firefox, Edge, Safari without console errors.
- Tasks and links survive a page reload (written to and read from `localStorage`).
- Storage warning banner appears when `localStorage.setItem` is mocked to throw `DOMException`.
