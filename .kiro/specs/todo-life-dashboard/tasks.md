# Tasks

## Task List

- [x] 1. Project scaffold and StorageModule
  - [x] 1.1 Create `index.htm` with semantic HTML structure: four widget sections (`#clock-widget`, `#timer-widget`, `#todo-widget`, `#links-widget`), a `#storage-warning` banner (hidden by default), and links to `css/style.css` and `js/script.js`
  - [x] 1.2 Create `css/style.css` with base layout styles (grid or flexbox), widget card styles, hidden/visible utility classes, and strikethrough style for completed tasks
  - [x] 1.3 Create `js/script.js` with the top-level IIFE wrapper and `App.init` wired to `DOMContentLoaded`
  - [x] 1.4 Implement `StorageModule` with `init()`, `get(key)`, `set(key, value)`, and `isAvailable()` — JSON serialization/deserialization, error catching, `degraded` flag, and `#storage-warning` banner display
  - [x] 1.5 Write unit tests for `StorageModule`: round-trip read/write, corrupt JSON returns `null`, unavailable storage shows warning banner (Property 4 — task persistence round-trip)

- [x] 2. ClockModule and GreetingModule
  - [x] 2.1 Implement `GreetingModule.getGreeting(hour)` as a pure function with the four boundary ranges (05–11 Morning, 12–17 Afternoon, 18–20 Evening, 21–04 Night)
  - [x] 2.2 Implement `GreetingModule.update(hour)` to write the greeting string to `#greeting-text`
  - [x] 2.3 Implement `ClockModule.init(containerEl)` with a 1-second `setInterval` that reads `new Date()`, formats HH:MM:SS for `#clock-time`, formats the human-readable date for `#clock-date`, and calls `GreetingModule.update` on each tick; handle invalid date with "Time unavailable"
  - [x] 2.4 Write property test for Property 1 (greeting boundary coverage and consistency): for any integer 0–23, `getGreeting` returns one of the four strings and is deterministic; minimum 100 iterations via fast-check
  - [x] 2.5 Write unit tests: "Time unavailable" when Date throws, correct greeting at each of the four boundary hours (5, 12, 18, 21), greeting updates when hour crosses a boundary

- [x] 3. TimerModule
  - [x] 3.1 Implement `TimerModule.init(containerEl)` with internal state (`remaining = 1500`, `intervalId = null`, `running = false`) and render the initial display "25:00"
  - [x] 3.2 Implement the `formatTime(seconds)` pure function that converts a seconds value (0–1500) to a zero-padded `MM:SS` string
  - [x] 3.3 Implement Start control: create `setInterval`, set `running = true`, disable Start button, enable Stop button
  - [x] 3.4 Implement Stop control: clear interval, set `running = false`, enable Start button, disable Stop button
  - [x] 3.5 Implement Reset control: call Stop, set `remaining = 1500`, re-render display, update button states
  - [x] 3.6 Implement countdown tick: decrement `remaining`, re-render; when `remaining === 0` call Stop and fire `window.alert`
  - [x] 3.7 Write property test for Property 12 (timer display format): for any integer 0–1500, `formatTime` output matches `/^\d{2}:\d{2}$/` and round-trips back to the input value; minimum 100 iterations
  - [x] 3.8 Write unit tests: initializes at 25:00, counts down by 1 after one tick, Stop retains remaining, Reset restores 25:00, alert fires at 00:00, button disabled states

- [x] 4. TodoModule — add and display
  - [x] 4.1 Implement `TodoModule.init(containerEl)`: load tasks from `StorageModule.get('tdl_tasks')` (default `[]`), call `renderAll()`
  - [x] 4.2 Implement `addTask(description)`: trim input, reject empty/whitespace (show `#todo-error`), generate id, push to array, persist, re-render
  - [x] 4.3 Implement `renderAll()`: clear `#todo-list`, render each task as `<li>` with checkbox, label, Edit button, Delete button; apply strikethrough class when `completed === true`
  - [x] 4.4 Write property test for Property 2 (task addition grows the list): for any task array and any valid description, `addTask` increases count by 1 and the new task appears; minimum 100 iterations
  - [x] 4.5 Write property test for Property 3 (whitespace-only task rejected): for any whitespace-only string, `addTask` leaves the list unchanged; minimum 100 iterations
  - [x] 4.6 Write property test for Property 4 (task persistence round-trip): for any task array, write to storage then read back returns equivalent array; minimum 100 iterations

- [x] 5. TodoModule — edit tasks
  - [x] 5.1 Implement edit mode: clicking Edit replaces the task label with an `<input>` pre-filled with the current description, and shows Save/Cancel controls
  - [x] 5.2 Implement `editTask(id, newDescription)`: trim input, reject empty/whitespace (retain original), update description in array, persist, re-render
  - [x] 5.3 Implement Cancel: discard changes, re-render without modifying state
  - [x] 5.4 Write property test for Property 5 (task edit preserves identity): for any task array and valid new description, only the target task's description changes; minimum 100 iterations
  - [x] 5.5 Write property test for Property 6 (whitespace-only edit rejected): for any task and whitespace-only input, description is unchanged; minimum 100 iterations

- [x] 6. TodoModule — complete and delete tasks
  - [x] 6.1 Implement `toggleTask(id)`: flip `completed` boolean, persist, re-render
  - [x] 6.2 Implement `deleteTask(id)`: filter task from array, persist, re-render
  - [x] 6.3 Write property test for Property 7 (completion toggle is an involution): for any task, double-toggle returns to original `completed` state; minimum 100 iterations
  - [x] 6.4 Write property test for Property 8 (deleted task is absent): for any task array and any task id in it, after `deleteTask` no task with that id remains; minimum 100 iterations

- [x] 7. LinksModule — display and navigate
  - [x] 7.1 Implement `LinksModule.init(containerEl)`: load links from `StorageModule.get('tdl_links')` (default `[]`), call `renderAll()`
  - [x] 7.2 Implement `renderAll()`: clear links container; if empty render placeholder message; otherwise render each link as a `<button>` with the link's label that calls `window.open(url, '_blank')` on click
  - [x] 7.3 Write unit tests: placeholder shown when no links, clicking a link button calls `window.open` with correct URL and `'_blank'`, links loaded from storage on init

- [x] 8. LinksModule — add and delete links
  - [x] 8.1 Implement `addLink(label, url)`: trim both fields, reject if label empty or URL does not start with `http://` or `https://` (show `#links-error` identifying the invalid field), generate id, push to array, persist, re-render
  - [x] 8.2 Implement `deleteLink(id)`: filter link from array, persist, re-render
  - [x] 8.3 Write property test for Property 9 (valid link addition grows the link list): for any link array and valid label+URL, `addLink` increases count by 1; minimum 100 iterations
  - [x] 8.4 Write property test for Property 10 (invalid URL rejected): for any URL not starting with `http://` or `https://`, `addLink` leaves the list unchanged; minimum 100 iterations
  - [x] 8.5 Write property test for Property 11 (deleted link is absent): for any link array and any link id in it, after `deleteLink` no link with that id remains; minimum 100 iterations

- [x] 9. Integration, accessibility, and cross-browser verification
  - [x] 9.1 Add ARIA labels and roles to interactive controls (timer buttons, todo checkboxes, edit/delete buttons, link buttons) and ensure keyboard navigation works throughout
  - [x] 9.2 Verify the dashboard opens from `file://` in Chrome, Firefox, Edge, and Safari without console errors
  - [x] 9.3 Verify tasks and links survive a page reload (end-to-end localStorage persistence)
  - [x] 9.4 Verify the storage warning banner appears and the app continues to function when `localStorage` is mocked to throw
  - [x] 9.5 Confirm only `index.htm`, `css/style.css`, and `js/script.js` are required (no build step, no package manager, no server)
