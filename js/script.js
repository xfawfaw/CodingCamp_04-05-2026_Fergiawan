(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // ParticleModule — floating particle background on <canvas id="particle-canvas">
  // Palette: solid light-pink #ffb3d1 and light-cyan #a5f3fc on white/dark bg.
  // Particles drift slowly and gently repel from the mouse cursor.
  // ---------------------------------------------------------------------------
  var ParticleModule = {
    _canvas: null,
    _ctx: null,
    _particles: [],
    _mouse: { x: -9999, y: -9999 },
    _raf: null,
    _COLORS_LIGHT: ['#ffb3d1', '#ffb3d1', '#a5f3fc', '#a5f3fc', '#ffd6e8', '#cffafe'],
    _COLORS_DARK:  ['#f472b6', '#22d3ee', '#ffb3d1', '#a5f3fc', '#e879f9', '#67e8f9'],
    _COUNT: 55,
    _REPEL_RADIUS: 90,
    _REPEL_FORCE: 0.045,

    init: function () {
      var self = this;
      this._canvas = document.getElementById('particle-canvas');
      if (!this._canvas) { return; }
      this._ctx = this._canvas.getContext('2d');
      this._resize();
      this._spawn();

      window.addEventListener('resize', function () { self._resize(); self._spawn(); });
      window.addEventListener('mousemove', function (e) {
        self._mouse.x = e.clientX;
        self._mouse.y = e.clientY;
      });
      window.addEventListener('mouseleave', function () {
        self._mouse.x = -9999;
        self._mouse.y = -9999;
      });

      this._loop();
    },

    _resize: function () {
      if (!this._canvas) { return; }
      this._canvas.width  = window.innerWidth;
      this._canvas.height = window.innerHeight;
    },

    _spawn: function () {
      var w = this._canvas.width;
      var h = this._canvas.height;
      this._particles = [];
      for (var i = 0; i < this._COUNT; i++) {
        this._particles.push(this._make(
          Math.random() * w,
          Math.random() * h
        ));
      }
    },

    _make: function (x, y) {
      var isDark = document.body.getAttribute('data-theme') === 'dark';
      var palette = isDark ? this._COLORS_DARK : this._COLORS_LIGHT;
      var r = 3 + Math.random() * 9;
      return {
        x: x, y: y,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: r,
        baseR: r,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 0.35 + Math.random() * 0.45,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.012
      };
    },

    _loop: function () {
      var self = this;
      this._raf = requestAnimationFrame(function () { self._loop(); });
      this._draw();
    },

    _draw: function () {
      var canvas = this._canvas;
      var ctx    = this._ctx;
      var w = canvas.width;
      var h = canvas.height;
      var mx = this._mouse.x;
      var my = this._mouse.y;
      var rr = this._REPEL_RADIUS;
      var rf = this._REPEL_FORCE;

      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < this._particles.length; i++) {
        var p = this._particles[i];

        /* Pulse size */
        p.pulse += p.pulseSpeed;
        p.r = p.baseR + Math.sin(p.pulse) * (p.baseR * 0.18);

        /* Mouse repulsion */
        var dx = p.x - mx;
        var dy = p.y - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < rr && dist > 0) {
          var force = (rr - dist) / rr;
          p.vx += (dx / dist) * force * rf;
          p.vy += (dy / dist) * force * rf;
        }

        /* Dampen velocity */
        p.vx *= 0.985;
        p.vy *= 0.985;

        /* Move */
        p.x += p.vx;
        p.y += p.vy;

        /* Wrap edges */
        if (p.x < -p.r)  { p.x = w + p.r; }
        if (p.x > w + p.r){ p.x = -p.r; }
        if (p.y < -p.r)  { p.y = h + p.r; }
        if (p.y > h + p.r){ p.y = -p.r; }

        /* Draw */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  };

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
  // ThemeModule — light / dark mode toggle, persisted to localStorage
  // ---------------------------------------------------------------------------
  var ThemeModule = {
    _key: 'tdl_theme',

    init: function () {
      var saved = StorageModule.get(this._key);
      // Also respect OS preference when no saved preference exists
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = saved !== null ? saved === 'dark' : prefersDark;
      this._apply(isDark);

      var self = this;
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.addEventListener('click', function () {
          self.toggle();
        });
      }
    },

    toggle: function () {
      var isDark = document.body.getAttribute('data-theme') === 'dark';
      this._apply(!isDark);
      StorageModule.set(this._key, !isDark ? 'dark' : 'light');
    },

    _apply: function (isDark) {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      var btn = document.getElementById('theme-toggle');
      var icon = document.getElementById('theme-icon');
      var label = document.getElementById('theme-label');
      if (btn) { btn.setAttribute('aria-pressed', String(isDark)); }
      if (icon) { icon.textContent = isDark ? '☀️' : '🌙'; }
      if (label) { label.textContent = isDark ? 'Light mode' : 'Dark mode'; }
      if (btn) { btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode'); }
      // Re-spawn particles with the new palette
      if (typeof ParticleModule !== 'undefined' && ParticleModule._canvas) {
        ParticleModule._spawn();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // GreetingModule — maps hour (0–23) to a greeting string, supports custom name
  // ---------------------------------------------------------------------------
  var GreetingModule = {
    _nameKey: 'tdl_name',

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

    // Returns the stored name, or empty string if none set
    getName: function () {
      var name = StorageModule.get(this._nameKey);
      return typeof name === 'string' ? name : '';
    },

    // Writes the greeting (+ optional name) to #greeting-text
    update: function (hour) {
      var el = document.getElementById('greeting-text');
      if (!el) { return; }
      var greeting = this.getGreeting(hour);
      var name = this.getName();
      el.textContent = name ? greeting + ', ' + name + '!' : greeting;
    },

    // Initialise the name UI (display + edit form)
    initNameUI: function () {
      var self = this;
      this._renderName();

      var editBtn    = document.getElementById('name-edit-btn');
      var cancelBtn  = document.getElementById('name-cancel-btn');
      var nameForm   = document.getElementById('name-form');
      var nameInput  = document.getElementById('name-input');

      if (editBtn) {
        editBtn.addEventListener('click', function () {
          var current = self.getName();
          if (nameInput) { nameInput.value = current; }
          if (nameForm)  { nameForm.removeAttribute('hidden'); }
          if (editBtn)   { editBtn.setAttribute('hidden', ''); }
          if (nameInput) { nameInput.focus(); }
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          self._closeForm();
        });
      }

      if (nameForm) {
        nameForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var val = nameInput ? nameInput.value.trim() : '';
          // Empty value clears the name
          StorageModule.set(self._nameKey, val);
          self._renderName();
          self._closeForm();
          // Immediately refresh greeting with new name
          var now = new Date();
          if (!isNaN(now.getTime())) {
            self.update(now.getHours());
          }
        });
      }
    },

    _renderName: function () {
      var nameDisplay = document.getElementById('name-display');
      var name = this.getName();
      if (nameDisplay) {
        nameDisplay.textContent = name ? 'Hi, ' + name : 'Set your name';
      }
    },

    _closeForm: function () {
      var nameForm  = document.getElementById('name-form');
      var editBtn   = document.getElementById('name-edit-btn');
      if (nameForm) { nameForm.setAttribute('hidden', ''); }
      if (editBtn)  { editBtn.removeAttribute('hidden'); }
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

    // Pure function — converts seconds (0–5999) to zero-padded "MM:SS"
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

    // Stop — clear interval, update state and buttons
    stop: function () {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.running = false;
      this.updateButtons();
      // Revert display to pink idle style
      var display = document.getElementById('timer-display');
      if (display) { display.classList.remove('running'); }
    },

    // Start — create interval, update state and buttons
    start: function () {
      var self = this;
      this.running = true;
      this.updateButtons();
      // Switch display to cyan running style
      var display = document.getElementById('timer-display');
      if (display) { display.classList.add('running'); }
      this.intervalId = setInterval(function () {
        self.tick();
      }, 1000);
    },

    // Countdown tick — decrement, re-render; bounce animation on each tick
    tick: function () {
      this.remaining -= 1;
      this.renderDisplay();
      var display = document.getElementById('timer-display');
      if (display) {
        display.classList.remove('animate-tick');
        void display.offsetWidth; /* reflow to restart animation */
        display.classList.add('animate-tick');
      }
      if (this.remaining === 0) {
        this.stop();
        window.alert("Time's up! Take a break.");
      }
    },

    // Reset — stop, restore to configured duration, re-render, update buttons
    reset: function () {
      this.stop();
      this.remaining = this._duration;
      this.renderDisplay();
      this.updateButtons();
    },

    // init — set up state, render initial display, wire button handlers
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      this._duration = 1500; // default 25 min
      this.remaining = this._duration;
      this.intervalId = null;
      this.running = false;

      this.renderDisplay();

      var self = this;
      var startBtn = document.getElementById('timer-start');
      var stopBtn  = document.getElementById('timer-stop');
      var resetBtn = document.getElementById('timer-reset');

      if (startBtn) {
        startBtn.addEventListener('click', function () { self.start(); });
      }
      if (stopBtn) {
        stopBtn.addEventListener('click', function () { self.stop(); });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', function () { self.reset(); });
      }

      this.updateButtons();
    }
  };

  // ---------------------------------------------------------------------------
  // TodoModule — CRUD task management backed by StorageModule
  // ---------------------------------------------------------------------------
  var TodoModule = {
    tasks: [],
    _sortKey: 'tdl_sort',

    // Load tasks from storage, wire form, render
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      var stored = StorageModule.get('tdl_tasks');
      this.tasks = Array.isArray(stored) ? stored : [];

      // Restore saved sort preference
      var savedSort = StorageModule.get(this._sortKey);
      var sortSelect = document.getElementById('todo-sort');
      if (sortSelect && savedSort) {
        sortSelect.value = savedSort;
      }

      // Wire form submit handler
      var self = this;
      var form  = document.getElementById('todo-form');
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

      // Wire sort select
      if (sortSelect) {
        sortSelect.addEventListener('change', function () {
          StorageModule.set(self._sortKey, sortSelect.value);
          self.renderAll();
        });
      }

      // Event delegation on #todo-list for checkbox/edit/delete/save/cancel
      var list = document.getElementById('todo-list');
      if (list) {
        list.addEventListener('click', function (e) {
          var target = e.target;
          var li = target.closest('li[data-id]');
          if (!li) { return; }
          var id = li.getAttribute('data-id');

          if (target.type === 'checkbox') {
            self.toggleTask(id);
          } else if (target.classList.contains('btn-edit')) {
            self.startEdit(id);
          } else if (target.classList.contains('btn-save')) {
            var editInput = li.querySelector('input.edit-input');
            var val = editInput ? editInput.value : '';
            self.editTask(id, val);
          } else if (target.classList.contains('btn-cancel')) {
            self.renderAll();
          } else if (target.classList.contains('btn-delete')) {
            self.deleteTask(id);
          }
        });
      }

      this.renderAll();
    },

    // Returns the sorted copy of tasks based on current select value
    _getSorted: function () {
      var sortSelect = document.getElementById('todo-sort');
      var mode = sortSelect ? sortSelect.value : 'added';
      var copy = this.tasks.slice();

      if (mode === 'alpha') {
        copy.sort(function (a, b) {
          return a.description.toLowerCase().localeCompare(b.description.toLowerCase());
        });
      } else if (mode === 'status') {
        copy.sort(function (a, b) {
          // incomplete (false) before complete (true)
          return (a.completed === b.completed) ? 0 : a.completed ? 1 : -1;
        });
      }
      // 'added' keeps insertion order (no sort needed)
      return copy;
    },

    // Validate, create, persist, re-render
    // Returns true on success, false on validation failure
    addTask: function (description) {
      var trimmed = typeof description === 'string' ? description.trim() : '';
      var errorEl = document.getElementById('todo-error');

      if (trimmed.length === 0) {
        if (errorEl) {
          errorEl.textContent = 'Task description cannot be empty.';
        }
        return false;
      }

      // Prevent duplicate tasks (case-insensitive)
      var lowerTrimmed = trimmed.toLowerCase();
      for (var d = 0; d < this.tasks.length; d++) {
        if (this.tasks[d].description.toLowerCase() === lowerTrimmed) {
          if (errorEl) {
            errorEl.textContent = 'That task already exists.';
          }
          return false;
        }
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

    // Switch a task item into inline edit mode
    startEdit: function (id) {
      var list = document.getElementById('todo-list');
      if (!list) { return; }
      var li = list.querySelector('li[data-id="' + id + '"]');
      if (!li) { return; }

      var task = null;
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          task = this.tasks[i];
          break;
        }
      }
      if (!task) { return; }

      var label     = li.querySelector('label');
      var editBtn   = li.querySelector('.btn-edit');
      var deleteBtn = li.querySelector('.btn-delete');
      if (label)     { label.style.display = 'none'; }
      if (editBtn)   { editBtn.style.display = 'none'; }
      if (deleteBtn) { deleteBtn.style.display = 'none'; }

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = task.description;

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

    // Flip completed boolean, persist, re-render
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

    // Filter task from array, persist, re-render
    deleteTask: function (id) {
      this.tasks = this.tasks.filter(function (t) { return t.id !== id; });
      StorageModule.set('tdl_tasks', this.tasks);
      this.renderAll();
    },

    // Validate and apply an edit to a task's description
    editTask: function (id, newDescription) {
      var trimmed = typeof newDescription === 'string' ? newDescription.trim() : '';

      if (trimmed.length === 0) {
        this.renderAll();
        return;
      }

      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          this.tasks[i].description = trimmed;
          break;
        }
      }

      StorageModule.set('tdl_tasks', this.tasks);
      this.renderAll();
    },

    // Clear and re-render all tasks (respecting current sort)
    renderAll: function () {
      var list = document.getElementById('todo-list');
      if (!list) { return; }

      list.innerHTML = '';

      var sorted = this._getSorted();

      for (var i = 0; i < sorted.length; i++) {
        var task = sorted[i];

        var li = document.createElement('li');
        li.setAttribute('data-id', task.id);

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed === true;
        checkbox.setAttribute('aria-label', 'Mark task complete');

        var label = document.createElement('label');
        label.textContent = task.description;
        if (task.completed === true) {
          label.classList.add('completed');
        }

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-label', 'Edit task: ' + task.description);

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

    // Load links from storage, wire form, render
    init: function (containerEl) { // eslint-disable-line no-unused-vars
      var stored = StorageModule.get('tdl_links');
      this.links = Array.isArray(stored) ? stored : [];

      var self = this;
      var form = document.getElementById('links-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var labelInput = document.getElementById('links-label-input');
          var urlInput   = document.getElementById('links-url-input');
          var label = labelInput ? labelInput.value : '';
          var url   = urlInput   ? urlInput.value   : '';
          var added = self.addLink(label, url);
          if (added) {
            if (labelInput) { labelInput.value = ''; }
            if (urlInput)   { urlInput.value   = ''; }
          }
        });
      }

      var container = document.getElementById('links-container');
      if (container) {
        container.addEventListener('click', function (e) {
          var target = e.target;
          if (target.tagName !== 'BUTTON' || !target.hasAttribute('data-id')) { return; }
          var id = target.getAttribute('data-id');
          if (target.classList.contains('btn-delete-link')) {
            self.deleteLink(id);
          } else {
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

    // Clear container; render placeholder or link buttons
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

    // Validate, create, persist, re-render
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

      if (errorEl) { errorEl.textContent = ''; }

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

    // Filter link from array, persist, re-render
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
      ParticleModule.init();
      ThemeModule.init();
      GreetingModule.initNameUI();
      ClockModule.init(document.getElementById('clock-widget'));
      TimerModule.init(document.getElementById('timer-widget'));
      TodoModule.init(document.getElementById('todo-widget'));
      LinksModule.init(document.getElementById('links-widget'));
    }
  };

  document.addEventListener('DOMContentLoaded', App.init);

}());
