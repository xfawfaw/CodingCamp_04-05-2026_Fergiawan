/**
 * greeting-module.js
 *
 * Standalone copy of GreetingModule extracted from js/script.js for unit/property testing.
 * Exposed as a global variable so test pages can access it directly without
 * dealing with the IIFE encapsulation in the main script.
 *
 * Greeting boundaries:
 *   05–11 → Good Morning
 *   12–17 → Good Afternoon
 *   18–20 → Good Evening
 *   21–23 and 0–4 → Good Night
 */

/* global window */
var GreetingModule = {
  /**
   * Pure function: maps hour (0–23) to a greeting string.
   * @param {number} hour - Integer in range 0–23
   * @returns {string} One of "Good Morning", "Good Afternoon", "Good Evening", "Good Night"
   */
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

  /**
   * Writes the greeting for the given hour to #greeting-text.
   * @param {number} hour - Integer in range 0–23
   */
  update: function (hour) {
    var el = document.getElementById('greeting-text');
    if (el) {
      el.textContent = GreetingModule.getGreeting(hour);
    }
  }
};
