/**
 * Uses classList - possibly use a polyfill for older browsers (http://caniuse.com/#feat=classlist)
 * Uses animationFrame - possibly use a polyfill for older browsers (http://caniuse.com/#feat=requestanimationframe)
 */

;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['meTools'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(meTools);
  } else {
    root.meShowTransition = factory(meTools);
  }
} (this, function(meTools) {

  var

  /*
   ---------------
   settings
   ---------------
   */

    defaultOptions = {
      callbacks: { // false or fn(params); params = {container: CONTAINER,immediate:BOOL (immediate show/hide call - no transition)}
        beforeShow: false,
        beforeShowTransition: false,
        afterShowTransition: false,
        afterShow: false,
        beforeHide: false,
        beforeHideTransition: false,
        afterHideTransition: false,
        afterHide: false
      },
      transitionEndElement: false, // element to listen to the transitionend event on (default is the container); use this if you use transitions on more than 1 element on show/hide to define the element which ends the transitions
      transitionMaxTime: 500, // ms; timeout to end the show/hide transition states in case the transitionEnd event doesn't fire; set to 0 to not support transition
      indicators: { // classes added to mark states
        shown: 'me-shown', // set to the container as long as it is shown
        show: 'me-show', // set to the container during the show-transition
        hide: 'me-hide' // set to the container during the hide-transition
      }
    }
    ;

  /*
   ---------------
   meShowTransition
   ---------------
   */


  /**
   * Create a new instance
   *
   * meShowTransition(container [,show] [,options])
   *
   * @param container mixed; id or element; the container in which the focus should be maintained
   * @param show boolean; optional; show the container immediately (without transitions) onInit; default is false
   * @param options object; optional; overwrite the default options
   */
  function meShowTransition(container, show, options) {

    var that = this;

    // prepare arguments
    if (typeof(show)!=='boolean') {
      options = show;
      show = false;
    }

    // init container
    var containerElement = container && meTools.getElementById(container);
    if (!containerElement) {
      throw new Error('meShowTransition: Container element not found');
    }

    // merge options
    initProperties.call(that).options = meTools.mergeObjects(defaultOptions, options);

    // prepare container
    that.container = containerElement;

    if (show) {
      this.show(true);
    } else {
      this.hide(true);
    }
  }


  /*
   ---------------
   private functions
   ---------------
   */

  function initProperties() {
    var that = this;

    that.options = {};
    that.container = null;
    that.shown = false;
    that.transitionEndTimeout = null;

    return that;
  }

  function markShown () {
    var that = this;
    that.container.classList.add(that.options.indicators.shown);
    that.container.setAttribute('aria-hidden','false');

    return that;
  }
  function markHidden () {
    var that = this;
    that.container.classList.remove(that.options.indicators.shown);
    that.container.setAttribute('aria-hidden','true');

    return that;
  }

  function showEnd (immediate) { // end of show
    immediate = immediate || false;
    var
      that = this,
      afterShowFn = that.options.callbacks.afterShow;

    if (afterShowFn) {
      afterShowFn({
        container: that.container,
        immediate: immediate
      });
    }

    return that;
  }
  function hideEnd (immediate) { // end of hide
    immediate = immediate || false;
    var
      that = this,
      container = that.container,
      afterHideFn = that.options.callbacks.afterHide;

    // hide container
    container.style.display = 'none';
    // mark as hidden
    markHidden.call(that);


    if (afterHideFn) {
      afterHideFn({
        container: container,
        immediate: immediate
      });
    }

    return that;
  }

  function showTransitionEnd () {
    var
      that = this,
      options = that.options,
      container = that.container,
      afterTransitionFn = options.callbacks.afterShowTransition,
      transitionEndElement = that.options.transitionEndElement
      ;

    // clear listeners
    clearTimeout(that.transitionEndTimeout);
    meTools.unregisterEvent(that,transitionEndElement,'webkitTransitionEnd');
    meTools.unregisterEvent(that,transitionEndElement,'transitionend');

    // after transition
    if (afterTransitionFn) {
      afterTransitionFn({
        container: container,
        immediate: false
      });
    }

    container.classList.remove(options.indicators.show);
    showEnd.call(that);

    return that;
  }

  function hideTransitionEnd () {
    var
      that = this,
      options = that.options,
      container = that.container,
      afterTransitionFn = options.callbacks.afterHideTransition,
      transitionEndElement = that.options.transitionEndElement
      ;

    // clear listeners
    clearTimeout(that.transitionEndTimeout);
    meTools.unregisterEvent(that,transitionEndElement,'webkitTransitionEnd');
    meTools.unregisterEvent(that,transitionEndElement,'transitionend');

    // after transition
    if (afterTransitionFn) {
      afterTransitionFn({
        container: container,
        immediate: false
      });
    }

    container.classList.remove(options.indicators.hide);
    hideEnd.call(that);

    return that;
  }

  /*
   ---------------
   prototype
   ---------------
   */

  /**
   * Start showing the container
   * @param immediate bool; optional; show immediately
   * @returns {meShowTransition}
   */
  meShowTransition.prototype.show = function (immediate) {
    var
      that = this,
      container = that.container;

    function _showTransitionEnd () {
      showTransitionEnd.call(that);
    }

    if (immediate || !that.shown || container.getAttribute('aria-hidden') === 'true') {

      var
        options = that.options,

        callbacks = options.callbacks,
        beforeShowFn = callbacks.beforeShow,
        beforeTransitionFn = callbacks.beforeShowTransition,

        indicators = options.indicators,

        transitionEndElement = options.transitionEndElement || container
        ;

      // start show (end possible hide-transition)
      hideTransitionEnd.call(that);
      that.shown = true;

      // before show
      if (beforeShowFn) {
        beforeShowFn({
          container: container,
          immediate: immediate
        });
      }

      // show container
      container.style.display = 'block';

      if (!immediate && options.transitionMaxTime) { // transition
        window.requestAnimationFrame(function () { // wait 2 ticks for the browser to apply the visibility
          window.requestAnimationFrame(function () {

            // before transition
            if (beforeTransitionFn) {
              beforeTransitionFn({
                container: container,
                immediate: false
              });
            }

            // mark as shown
            markShown.call(that);

            // start show transition and listeners
            container.classList.add(indicators.show);

            meTools.registerEvent(that,transitionEndElement,'webkitTransitionEnd', _showTransitionEnd);
            meTools.registerEvent(that,transitionEndElement,'transitionend', _showTransitionEnd);

            // set a transition-timeout in case the end-event doesn't fire
            that.transitionEndTimeout = setTimeout(_showTransitionEnd, options.transitionMaxTime);

          });
        });

      } else { // immediate show
        markShown.call(that);
        showEnd.call(that,immediate);
      }

    }

    return that;
  };

  /**
   * Start hiding the container
   * @param immediate bool; optional; hide immediately
   * @returns {meShowTransition}
   */
  meShowTransition.prototype.hide = function (immediate) {
    var
      that = this,
      container = that.container;

    function _hideTransitionEnd () {
      hideTransitionEnd.call(that);
    }

    if (immediate || that.shown || container.getAttribute('aria-hidden') === 'false') {
      var

        options = that.options,

        callbacks = options.callbacks,
        beforeHideFn = callbacks.beforeHide,
        beforeTransitionFn = callbacks.beforeHideTransition,

        indicators = options.indicators,

        transitionEndElement = options.transitionEndElement || container
        ;

      // start hide (end possible show-transition)
      showTransitionEnd.call(that);
      that.shown = false;

      // before hide
      if (beforeHideFn) {
        beforeHideFn({
          container: container,
          immediate: immediate
        });
      }

      if (!immediate && options.transitionMaxTime) { // transition
        window.requestAnimationFrame(function () { // wait 2 ticks for the browser to apply beforeHideFn changes
          window.requestAnimationFrame(function () {

            // before transition
            if (beforeTransitionFn) {
              beforeTransitionFn({
                container: container,
                immediate: false
              });
            }

            // start show transition and listeners
            container.classList.add(indicators.hide);

            meTools.registerEvent(that,transitionEndElement,'webkitTransitionEnd', _hideTransitionEnd);
            meTools.registerEvent(that,transitionEndElement,'transitionend', _hideTransitionEnd);

            // set a transition-timeout in case the end-event doesn't fire
            that.transitionEndTimeout = setTimeout(_hideTransitionEnd, options.transitionMaxTime);

          });
        });

      } else { // immediate hide
        hideEnd.call(that);
      }
    }

    return that;
  };


  /**
   * Destroy the instance
   * @returns {null}
   */
  meShowTransition.prototype.destroy = function () {
    var that = this,
      container = that.container,
      indicators = that.options.indicators
      ;

    // clear listeners
    clearTimeout(that.transitionEndTimeout);
    meTools.unregisterEvent(that);

    // remove added classes
    for (var i in indicators) {
      container.classList.remove(indicators[i]);
    }

    // reset properties and remove all references
    initProperties.call(that);

    return null;
  };

  return meShowTransition;

}));