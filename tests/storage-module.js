/**
 * storage-module.js
 *
 * Standalone copy of StorageModule extracted from js/script.js for unit/property testing.
 * Exposed as a global variable so tests/index.html can access it directly without
 * dealing with the IIFE encapsulation in the main script.
 */

/* global window */
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
