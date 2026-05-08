/**
 * timer-module.js
 *
 * Standalone copy of TimerModule.formatTime extracted from js/script.js for
 * unit/property testing. Exposed as a global variable so timer-module.html
 * can access it directly without dealing with the IIFE encapsulation in the
 * main script.
 */

/* global window */
var TimerModule = {
  // Internal state
  remaining: 1500,
  intervalId: null,
  running: false,

  // Pure function — converts seconds (0–1500) to zero-padded "MM:SS"
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
  },

  // Start — create interval, update state and buttons
  start: function () {
    var self = this;
    this.running = true;
    this.updateButtons();
    this.intervalId = setInterval(function () {
      self.tick();
    }, 1000);
  },

  // Countdown tick — decrement, re-render; alert and stop at 0
  tick: function () {
    this.remaining -= 1;
    this.renderDisplay();
    if (this.remaining === 0) {
      this.stop();
      window.alert("Time's up! Take a break.");
    }
  },

  // Reset — stop, restore remaining, re-render, update buttons
  reset: function () {
    this.stop();
    this.remaining = 1500;
    this.renderDisplay();
    this.updateButtons();
  },

  // init — set up state, render initial display, wire button handlers
  init: function (containerEl) { // eslint-disable-line no-unused-vars
    this.remaining = 1500;
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
