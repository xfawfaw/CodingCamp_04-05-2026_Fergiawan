(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // StorageModule — wraps localStorage with JSON serialization and error handling
  // ---------------------------------------------------------------------------
  var StorageModule = {
    _degraded: false,

    _showWarning: function () {
      var banner = document.getElementById('storage-warning');
      if (banner) {
        banner.removeAttribute('hidden');
      }
    },

    init: function () {
      if (!this.isAvailable()) {
        this._degraded = true;
        this._showWarning();
      }
    },

    isAvailable: function () {
      var testKey = '__tdl_storage_test__';
      try {
        localStorage.setItem(testKey, '1');
        localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    },

    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) {
          return null;
        }
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    set: function (key, value) {
      try {
        var json = JSON.stringify(value);
        localStorage.setItem(key, json);
      } catch (e) {
        this._degraded = true;
        this._showWarning();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // GreetingModule — maps hour (0–23) to a greeting string
  // ---------------------------------------------------------------------------
  var GreetingModule = {
    // Pure function: maps hour (0–23) to a greeting string.
    // 05–11 → Good Morning, 12–17 → Good Afternoon,
    // 18–20 → Good Evening, 21–23 and 0–4 → Good Night
    getGreeting: function (hour) {
      if (hour >= 5 && hour <= 11) {
        return 'Good Morning';
      }
      if (hour >= 12 && hour <= 17) {
        return 'Good Afternoon';
      }
      if (hour >= 18 && hour <= 20) {
        return 'Good Evening';
      }
      return 'Good Night';
    },

    // Writes the greeting for the given hour to #greeting-text
    update: function (hour) {
      var el = document.getElementById('greeting-text');
      if (el) {
        el.textContent = GreetingModule.getGreeting(hour);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // ClockModule — live clock and date display; delegates greeting to GreetingModule
  // ---------------------------------------------------------------------------
  var ClockModule = {
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      var timeEl = document.getElementById('clock-time');
      var dateEl = document.getElementById('clock-date');

      function pad(n) {
        return String(n).padStart(2, '0');
      }

      function tick() {
        var date;
        var isValid = false;

        try {
          date = new Date();
          // isNaN on a Date object checks if the underlying time value is NaN
          isValid = !isNaN(date.getTime());
        } catch (e) {
          isValid = false;
        }

        if (isValid) {
          var hh = pad(date.getHours());
          var mm = pad(date.getMinutes());
          var ss = pad(date.getSeconds());
          if (timeEl) {
            timeEl.textContent = hh + ':' + mm + ':' + ss;
          }
          if (dateEl) {
            dateEl.textContent = date.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
          GreetingModule.update(date.getHours());
        } else {
          if (timeEl) {
            timeEl.textContent = 'Time unavailable';
          }
          if (dateEl) {
            dateEl.textContent = '';
          }
        }
      }

      // Populate immediately so the display isn't blank for the first second
      tick();
      setInterval(tick, 1000);
    }
  };

  // ---------------------------------------------------------------------------
  // TimerModule — 25-minute Pomodoro countdown
  // ---------------------------------------------------------------------------
  var TimerModule = {
    // Internal state
    remaining: 1500,
    intervalId: null,
    running: false,

    // Task 3.2: Pure function — converts seconds (0–1500) to zero-padded "MM:SS"
    formatTime: function (seconds) {
      var mm = Math.floor(seconds / 60);
      var ss = seconds % 60;
      return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    },

    // Sync disabled states of Start/Stop buttons based on running flag
    updateButtons: function () {
      var startBtn = document.getElementById('timer-start');
      var stopBtn  = document.getElementById('timer-stop');
      if (startBtn) { startBtn.disabled = this.running; }
      if (stopBtn)  { stopBtn.disabled  = !this.running; }
    },

    // Re-render the display element with the current remaining time
    renderDisplay: function () {
      var display = document.getElementById('timer-display');
      if (display) {
        display.textContent = this.formatTime(this.remaining);
      }
    },

    // Task 3.4: Stop — clear interval, update state and buttons
    stop: function () {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.running = false;
      this.updateButtons();
    },

    // Task 3.3: Start — create interval, update state and buttons
    start: function () {
      var self = this;
      this.running = true;
      this.updateButtons();
      this.intervalId = setInterval(function () {
        self.tick();
      }, 1000);
    },

    // Task 3.6: Countdown tick — decrement, re-render; alert and stop at 0
    tick: function () {
      this.remaining -= 1;
      this.renderDisplay();
      if (this.remaining === 0) {
        this.stop();
        window.alert("Time's up! Take a break.");
      }
    },

    // Task 3.5: Reset — stop, restore remaining, re-render, update buttons
    reset: function () {
      this.stop();
      this.remaining = 1500;
      this.renderDisplay();
      this.updateButtons();
    },

    // Task 3.1: init — set up state, render initial display, wire button handlers
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      // Reset to initial state
      this.remaining = 1500;
      this.intervalId = null;
      this.running = false;

      // Render initial "25:00"
      this.renderDisplay();

      // Wire up button click handlers
      var self = this;
      var startBtn  = document.getElementById('timer-start');
      var stopBtn   = document.getElementById('timer-stop');
      var resetBtn  = document.getElementById('timer-reset');

      if (startBtn) {
        startBtn.addEventListener('click', function () { self.start(); });
      }
      if (stopBtn) {
        stopBtn.addEventListener('click', function () { self.stop(); });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', function () { self.reset(); });
      }

      // Ensure button states match initial running=false
      this.updateButtons();
    }
  };

  // ---------------------------------------------------------------------------
  // TodoModule — CRUD task management backed by StorageModule
  // ---------------------------------------------------------------------------
  var TodoModule = {
    tasks: [],

    // Task 4.1: Load tasks from storage, wire form, render
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      var stored = StorageModule.get('tdl_tasks');
      this.tasks = Array.isArray(stored) ? stored : [];

      // Wire form submit handler
      var self = this;
      var form = document.getElementById('todo-form');
      var input = document.getElementById('todo-input');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var val = input ? input.value : '';
          var added = self.addTask(val);
          if (added && input) {
            input.value = '';
          }
        });
      }

      // Task 4.3: Event delegation on #todo-list for checkbox/edit/delete/save/cancel
      var list = document.getElementById('todo-list');
      if (list) {
        list.addEventListener('click', function (e) {
          var target = e.target;
          var li = target.closest('li[data-id]');
          if (!li) { return; }
          var id = li.getAttribute('data-id');

          if (target.type === 'checkbox') {
            // toggleTask will be implemented in task 6
            if (typeof self.toggleTask === 'function') {
              self.toggleTask(id);
            }
          } else if (target.classList.contains('btn-edit')) {
            self.startEdit(id);
          } else if (target.classList.contains('btn-save')) {
            var editInput = li.querySelector('input.edit-input');
            var val = editInput ? editInput.value : '';
            self.editTask(id, val);
          } else if (target.classList.contains('btn-cancel')) {
            self.renderAll();
          } else if (target.classList.contains('btn-delete')) {
            // deleteTask will be implemented in task 6
            if (typeof self.deleteTask === 'function') {
              self.deleteTask(id);
            }
          }
        });
      }

      this.renderAll();
    },

    // Task 4.2: Validate, create, persist, re-render
    addTask: function (description) {
      var trimmed = typeof description === 'string' ? description.trim() : '';
      var errorEl = document.getElementById('todo-error');

      if (trimmed.length === 0) {
        if (errorEl) {
          errorEl.textContent = 'Task description cannot be empty.';
        }
        return false;
      }

      // Clear any previous error
      if (errorEl) {
        errorEl.textContent = '';
      }

      // Generate id with crypto.randomUUID() fallback
      var id;
      try {
        id = crypto.randomUUID();
      } catch (e) {
        id = Date.now().toString() + Math.random().toString().slice(2);
      }

      var task = {
        id: id,
        description: trimmed,
        completed: false,
        createdAt: Date.now()
      };

      this.tasks.push(task);
      StorageModule.set('tdl_tasks', this.tasks);
      this.renderAll();
      return true;
    },

    // Task 5.1: Switch a task item into inline edit mode
    startEdit: function (id) {
      var list = document.getElementById('todo-list');
      if (!list) { return; }
      var li = list.querySelector('li[data-id="' + id + '"]');
      if (!li) { return; }

      // Find the task's current description
      var task = null;
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          task = this.tasks[i];
          break;
        }
      }
      if (!task) { return; }

      // Hide label and Edit/Delete buttons
      var label = li.querySelector('label');
      var editBtn = li.querySelector('.btn-edit');
      var deleteBtn = li.querySelector('.btn-delete');
      if (label)     { label.style.display = 'none'; }
      if (editBtn)   { editBtn.style.display = 'none'; }
      if (deleteBtn) { deleteBtn.style.display = 'none'; }

      // Insert edit input pre-filled with current description
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = task.description;

      // Insert Save and Cancel buttons
      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn-save';
      saveBtn.textContent = 'Save';
      saveBtn.setAttribute('aria-label', 'Save task edit');

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-cancel';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.setAttribute('aria-label', 'Cancel task edit');

      li.appendChild(input);
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);

      input.focus();
    },

    // Task 6.1: Flip completed boolean, persist, re-render
    toggleTask: function (id) {
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          this.tasks[i].completed = !this.tasks[i].completed;
          break;
        }
      }
      StorageModule.set('tdl_tasks', this.tasks);
      this.renderAll();
    },

    // Task 6.2: Filter task from array, persist, re-render
    deleteTask: function (id) {
      this.tasks = this.tasks.filter(function (t) { return t.id !== id; });
      StorageModule.set('tdl_tasks', this.tasks);
      this.renderAll();
    },

    // Task 5.2: Validate and apply an edit to a task's description
    editTask: function (id, newDescription) {
      var trimmed = typeof newDescription === 'string' ? newDescription.trim() : '';

      if (trimmed.length === 0) {
        // Reject empty/whitespace — restore display without modifying state
        this.renderAll();
        return;
      }

      // Find and update the task
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          this.tasks[i].description = trimmed;
          break;
        }
      }

      StorageModule.set('tdl_tasks', this.tasks);
      this.renderAll();
    },

    // Task 4.3: Clear and re-render all tasks
    renderAll: function () {
      var list = document.getElementById('todo-list');
      if (!list) { return; }

      list.innerHTML = '';

      for (var i = 0; i < this.tasks.length; i++) {
        var task = this.tasks[i];

        var li = document.createElement('li');
        li.setAttribute('data-id', task.id);

        // Checkbox
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed === true;
        checkbox.setAttribute('aria-label', 'Mark task complete');

        // Label
        var label = document.createElement('label');
        label.textContent = task.description;
        if (task.completed === true) {
          label.classList.add('completed');
        }

        // Edit button
        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-label', 'Edit task: ' + task.description);

        // Delete button
        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.description);

        li.appendChild(checkbox);
        li.appendChild(label);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        list.appendChild(li);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // LinksModule — user-defined quick-link buttons backed by StorageModule
  // ---------------------------------------------------------------------------
  var LinksModule = {
    links: [],

    // Task 7.1: Load links from storage, wire form, render
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      var stored = StorageModule.get('tdl_links');
      this.links = Array.isArray(stored) ? stored : [];

      // Wire form submit handler (addLink will be implemented in task 8)
      var self = this;
      var form = document.getElementById('links-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var labelInput = document.getElementById('links-label-input');
          var urlInput   = document.getElementById('links-url-input');
          var label = labelInput ? labelInput.value : '';
          var url   = urlInput   ? urlInput.value   : '';
          if (typeof self.addLink === 'function') {
            var added = self.addLink(label, url);
            if (added) {
              if (labelInput) { labelInput.value = ''; }
              if (urlInput)   { urlInput.value   = ''; }
            }
          }
        });
      }

      // Event delegation on #links-container for button clicks
      var container = document.getElementById('links-container');
      if (container) {
        container.addEventListener('click', function (e) {
          var target = e.target;
          if (target.tagName !== 'BUTTON' || !target.hasAttribute('data-id')) { return; }
          var id = target.getAttribute('data-id');
          if (target.classList.contains('btn-delete-link')) {
            self.deleteLink(id);
          } else {
            // Find the link and open it
            for (var i = 0; i < self.links.length; i++) {
              if (self.links[i].id === id) {
                window.open(self.links[i].url, '_blank');
                break;
              }
            }
          }
        });
      }

      this.renderAll();
    },

    // Task 7.2: Clear container; render placeholder or link buttons
    renderAll: function () {
      var container = document.getElementById('links-container');
      if (!container) { return; }

      container.innerHTML = '';

      if (this.links.length === 0) {
        var placeholder = document.createElement('p');
        placeholder.textContent = 'No links yet. Add your first link above.';
        container.appendChild(placeholder);
        return;
      }

      for (var i = 0; i < this.links.length; i++) {
        var link = this.links[i];

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = link.label;
        btn.setAttribute('data-id', link.id);
        btn.setAttribute('aria-label', 'Open ' + link.label + ' in new tab');

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete-link';
        deleteBtn.setAttribute('data-id', link.id);
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete link: ' + link.label);

        container.appendChild(btn);
        container.appendChild(deleteBtn);
      }
    },

    // Task 8.1: Validate, create, persist, re-render
    addLink: function (label, url) {
      var trimmedLabel = typeof label === 'string' ? label.trim() : '';
      var trimmedUrl   = typeof url   === 'string' ? url.trim()   : '';
      var errorEl = document.getElementById('links-error');

      if (trimmedLabel.length === 0) {
        if (errorEl) { errorEl.textContent = 'Label cannot be empty.'; }
        return false;
      }

      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        if (errorEl) { errorEl.textContent = 'URL must start with http:// or https://.'; }
        return false;
      }

      // Clear any previous error
      if (errorEl) { errorEl.textContent = ''; }

      // Generate id with crypto.randomUUID() fallback
      var id;
      try {
        id = crypto.randomUUID();
      } catch (e) {
        id = Date.now().toString() + Math.random().toString().slice(2);
      }

      this.links.push({ id: id, label: trimmedLabel, url: trimmedUrl });
      StorageModule.set('tdl_links', this.links);
      this.renderAll();
      return true;
    },

    // Task 8.2: Filter link from array, persist, re-render
    deleteLink: function (id) {
      this.links = this.links.filter(function (l) { return l.id !== id; });
      StorageModule.set('tdl_links', this.links);
      this.renderAll();
    }
  };

  // ---------------------------------------------------------------------------
  // App — entry point; wires DOMContentLoaded to module initialisation
  // ---------------------------------------------------------------------------
  var App = {
    init: function () {
      StorageModule.init();
      ClockModule.init(document.getElementById('clock-widget'));
      TimerModule.init(document.getElementById('timer-widget'));
      TodoModule.init(document.getElementById('todo-widget'));
      LinksModule.init(document.getElementById('links-widget'));
    }
  };

  document.addEventListener('DOMContentLoaded', App.init);

}());
