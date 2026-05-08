/**
 * links-module.js
 *
 * Standalone copy of LinksModule extracted from js/script.js for unit/property
 * testing. Exposed as a global variable so links-module.html can access it
 * directly without dealing with the IIFE encapsulation in the main script.
 *
 * Key difference from the production version: the storage dependency is
 * injectable. Pass a storage object to LinksModule.init() or set
 * LinksModule._storage directly. If neither is provided, an in-memory mock is
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
// LinksModule — standalone, DOM-tolerant, storage-injectable
// ---------------------------------------------------------------------------
var LinksModule = {
  links: [],

  // The storage backend used by this module.
  // Defaults to InMemoryStorage; can be replaced with any object that
  // implements get/set.
  _storage: InMemoryStorage,

  // ---------------------------------------------------------------------------
  // init — load links from storage, wire form, render
  // Accepts an optional storage object as the second argument so tests can
  // inject a mock without touching the module-level _storage property.
  // ---------------------------------------------------------------------------
  init: function (containerEl, storage) { // eslint-disable-line no-unused-vars
    if (storage) {
      this._storage = storage;
    }

    var stored = this._storage.get('tdl_links');
    this.links = Array.isArray(stored) ? stored : [];

    // Wire form submit handler (only if the DOM elements exist)
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

  // ---------------------------------------------------------------------------
  // renderAll — clear container; render placeholder or link buttons
  // Guards against a missing #links-container so tests without a full DOM
  // can call methods without errors.
  // ---------------------------------------------------------------------------
  renderAll: function () {
    var container = document.getElementById('links-container');
    if (!container) { return; } // DOM-free environments: skip rendering

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

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-link';
      deleteBtn.setAttribute('data-id', link.id);
      deleteBtn.textContent = 'Delete';

      container.appendChild(btn);
      container.appendChild(deleteBtn);
    }
  },
  // ---------------------------------------------------------------------------
  // addLink — validate, create, persist, re-render
  // Returns true on success, false on validation failure.
  // (Full implementation in task 8; stub here for test completeness.)
  // ---------------------------------------------------------------------------
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

    var link = {
      id: id,
      label: trimmedLabel,
      url: trimmedUrl
    };

    this.links.push(link);
    this._storage.set('tdl_links', this.links);
    this.renderAll();
    return true;
  },

  // ---------------------------------------------------------------------------
  // deleteLink — filter link from array, persist, re-render
  // ---------------------------------------------------------------------------
  deleteLink: function (id) {
    this.links = this.links.filter(function (l) { return l.id !== id; });
    this._storage.set('tdl_links', this.links);
    this.renderAll();
  }
};
