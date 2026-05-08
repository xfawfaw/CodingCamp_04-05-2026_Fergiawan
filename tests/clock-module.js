/**
 * clock-module.js
 *
 * Standalone copy of ClockModule extracted from js/script.js for unit testing.
 * Exposed as a global variable so test pages can access it directly without
 * dealing with the IIFE encapsulation in the main script.
 *
 * Depends on GreetingModule being loaded first (greeting-module.js).
 */

/* global GreetingModule */
var ClockModule = {
  /**
   * Initialises the clock: reads Date every second and updates #clock-time,
   * #clock-date, and delegates greeting to GreetingModule.
   * If new Date() throws or returns an invalid date, displays "Time unavailable".
   *
   * @param {HTMLElement} containerEl - The clock widget container (unused directly;
   *   the module targets elements by id)
   * @returns {{ stop: function }} An object with a stop() method to clear the interval
   *   (useful for testing)
   */
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
    var intervalId = setInterval(tick, 1000);

    return {
      stop: function () {
        clearInterval(intervalId);
      }
    };
  }
};
