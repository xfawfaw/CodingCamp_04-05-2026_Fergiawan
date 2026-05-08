/**
 * todo-module.js
 *
 * Standalone copy of TodoModule extracted from js/script.js for unit/property
 * testing. Exposed as a global variable so todo-module.html can access it
 * directly without dealing with the IIFE encapsulation in the main script.
 *
 * Key difference from the production version: the storage dependency is
 * injectable. Pass a storage object to TodoModule.init() or set
 * TodoModule._storage directly. If neither is provided, an in-memory mock is
 * used so tests never touch real localStorage and run in complete isolation.
 */

/* global window */

// ---------------------------------------------------------------------------
// Default in-memory storage mock (used when no real storage is injected)
// ---------------------------------------------------------------------------
var InMemoryStorage = {
  _store: {},

  get: function (key) {
    var val = this._store[key];
    return val !== undefined ? val : null;
  },

  set: function (key, value) {
    this._store[key] = value;
  },

  reset: function () {
    this._store = {};
  }
};

// ---------------------------------------------------------------------------
// TodoModule — standalone, DOM-tolerant, storage-injectable
// ---------------------------------------------------------------------------
var TodoModule = {
  tasks: [],

  // The storage backend used by this module.
  // Defaults to InMemoryStorage; can be replaced with StorageModule for
  // integration tests or with any object that implements get/set.
  _storage: InMemoryStorage,

  // ---------------------------------------------------------------------------
  // init — load tasks from storage, wire form, render
  // Accepts an optional storage object as the second argument so tests can
  // inject a mock without touching the module-level _storage property.
  // ---------------------------------------------------------------------------
  init: function (containerEl, storage) { // eslint-disable-line no-unused-vars
    if (storage) {
      this._storage = storage;
    }

    var stored = this._storage.get('tdl_tasks');
    this.tasks = Array.isArray(stored) ? stored : [];

    // Wire form submit handler (only if the DOM elements exist)
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

    // Event delegation on #todo-list (only if the element exists)
    var list = document.getElementById('todo-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var target = e.target;
        var li = target.closest('li[data-id]');
        if (!li) { return; }
        var id = li.getAttribute('data-id');

        if (target.type === 'checkbox') {
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
          if (typeof self.deleteTask === 'function') {
            self.deleteTask(id);
          }
        }
      });
    }

    this.renderAll();
  },

  // ---------------------------------------------------------------------------
  // addTask — validate, create, persist, re-render
  // Returns true on success, false on validation failure.
  // ---------------------------------------------------------------------------
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
    this._storage.set('tdl_tasks', this.tasks);
    this.renderAll();
    return true;
  },

  // ---------------------------------------------------------------------------
  // startEdit — switch a task item into inline edit mode
  // ---------------------------------------------------------------------------
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

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'Cancel';

    li.appendChild(input);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);

    input.focus();
  },

  // ---------------------------------------------------------------------------
  // toggleTask — flip completed boolean, persist, re-render
  // ---------------------------------------------------------------------------
  toggleTask: function (id) {
    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].id === id) {
        this.tasks[i].completed = !this.tasks[i].completed;
        break;
      }
    }
    this._storage.set('tdl_tasks', this.tasks);
    this.renderAll();
  },

  // ---------------------------------------------------------------------------
  // deleteTask — filter task from array, persist, re-render
  // ---------------------------------------------------------------------------
  deleteTask: function (id) {
    this.tasks = this.tasks.filter(function (t) { return t.id !== id; });
    this._storage.set('tdl_tasks', this.tasks);
    this.renderAll();
  },

  // ---------------------------------------------------------------------------
  // editTask — validate and apply an edit to a task's description
  // Returns nothing; calls renderAll() in all cases.
  // ---------------------------------------------------------------------------
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

    this._storage.set('tdl_tasks', this.tasks);
    this.renderAll();
  },

  // ---------------------------------------------------------------------------
  // renderAll — clear and re-render all tasks into #todo-list
  // Guards against a missing #todo-list element so tests without a full DOM
  // can call addTask() without errors.
  // ---------------------------------------------------------------------------
  renderAll: function () {
    var list = document.getElementById('todo-list');
    if (!list) { return; } // DOM-free environments: skip rendering

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

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Delete';

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);

      list.appendChild(li);
    }
  }
};
