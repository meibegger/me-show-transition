/**
 * @license me-show-transition 3.0.4 Copyright (c) Mandana Eibegger <scripts@schoener.at>
 * Available via the MIT license.
 * see: https://github.com/meibegger/me-show-transition for details
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.meShowTransition = factory();
  }
}(this, function () {


/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

/**
 * @license me-tools 3.0.0 Copyright (c) Mandana Eibegger <scripts@schoener.at>
 * Available via the MIT license.
 * see: https://github.com/meibegger/me-tools for details
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTools.fn.variable', [
    ], factory);
  } else if(typeof exports === 'object') {
    if (typeof module === 'object') {
      module.exports = factory();
    } else {
      exports['meTools.fn.variable'] = factory();
    }
  } else {
    root.meTools = root.meTools || {};
    root.meTools.fn = root.meTools.fn || {};
    root.meTools.fn.variable = factory();
  }
}(this, function () {

  /*
   ---------------
   functions
   ---------------
   */

  /**
   * Create a copy of a variable.
   *
   * copyValues(vals [, deep])
   *
   * @param vals mixed
   * @param deep bool; optional; deep-copy; default is true
   * @returns {*} mixed; a copy of the passed value
   */
  function copyValues(vals, deep) {
    deep = (typeof(deep) === 'undefined') || deep;

    var copy,
      val;
    if (Array.isArray(vals)) {
      copy = [];
      for (var i in vals) {
        val = vals[i];
        copy.push((deep && typeof val === 'object') ?
          copyValues(val)
          : val);
      }

    } else if (vals && typeof(vals) === 'object' && typeof(vals.tagName) === 'undefined' && vals !== window && vals !== document) {
      copy = {};
      for (var key in vals) {
        val = vals[key];
        copy[key] = (deep && typeof val === 'object') ?
          copyValues(val)
          : val;
      }

    } else {
      copy = vals;
    }
    return copy;
  }

  /**
   * Merge 2 Objects and return a copy.
   *
   * mergeObjects(object1, object2)
   *
   * @param object1 Object
   * @param object2 Object
   * @returns {{}} New merged Object
   */
  function mergeObjects(object1, object2) {
    object1 = object1 || {};
    object2 = object2 || {};
    var result = {};
    for (var key1 in object1) {
      var option1 = object1[key1];
      if (object2.hasOwnProperty(key1)) {
        var option2 = object2[key1];
        if (Array.isArray(option2) || typeof(option2) !== 'object' || typeof(option1) !== 'object') {
          result[key1] = copyValues(option2);
        } else {
          result[key1] = mergeObjects(option1, option2);
        }
      } else {
        result[key1] = copyValues(option1);
      }
    }
    for (var key2 in object2) {
      if (!result.hasOwnProperty(key2)) {
        result[key2] = copyValues(object2[key2]);
      }
    }
    return result;
  }

  /**
   * Check if an object is empty.
   *
   * isEmptyObject(object)
   *
   * @param object Object
   * @returns {boolean}
   */
  function isEmptyObject(object) {
    for (var i in object) {
      return false;
    }
    return true;
  }

  /*
   ---------------
   api
   ---------------
   */

  return {
    copyValues: copyValues,
    mergeObjects: mergeObjects,
    isEmptyObject: isEmptyObject
  };

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTools.fn.element', [
    ], factory);
  } else if(typeof exports === 'object') {
    if (typeof module === 'object') {
      module.exports = factory();
    } else {
      exports['meTools.fn.element'] = factory();
    }
  } else {
    root.meTools = root.meTools || {};
    root.meTools.fn = root.meTools.fn || {};
    root.meTools.fn.element = factory();
  }
}(this, function () {

  /*
   ---------------
   functions
   ---------------
   */

  /**
   * Get the specified element.
   *
   * getElementById(elementSpec)
   *
   * @param elementSpec mixed; string (id) or element;
   * @returns {*} element or null
   */
  function getElementById(elementSpec) {
    if (typeof(elementSpec) === 'object' && typeof(elementSpec.tagName) !== 'undefined') {
      return elementSpec;

    } else if (typeof(elementSpec) === 'string') {
      return document.getElementById(elementSpec);

    } else {
      return null;
    }
  }

  /**
   * Get the ID of an element. If the element has no ID, it will be assigned a random ID.
   *
   * getId(element [, prefix])
   *
   * @param element DOM element
   * @param prefix string; optional; A prefix for generated IDs; default is 'id-'
   * @returns {string} ID
   */
  function getId(element, prefix) {
    var id = element.getAttribute('id');

    if (!id) { // assign an ID
      prefix = prefix || 'id-';
      do {
        var date = new Date();
        id = prefix + Math.ceil(date.valueOf() % 10000 * Math.random());
      } while (document.getElementById(id));

      element.setAttribute('id', id);
    }

    return id;
  }

  /**
   * Get all ancestors of an element, possibly matching a selector, up to an optional container.
   *
   * Note: this function uses matches(selector), so you need to include a polyfill for all IEs!
   *
   * getAncestors(element [, selector] [, container] [, single])
   *
   * @param element DOM-Element;
   * @param selector String; optional; selector to match the parents against
   * @param container DOM-Element; optional; max parent to check; default is body
   * @param single Boolean; optional; return only the next matching ancestor
   * @return mixed; array or false/element if single===true
   */
  function getAncestors(element, selector, container, single) {
    // prepare arguments
    var
      argSelector = false,
      argContainer = false,
      argSingle = false;
    for (var i = 1; i < arguments.length; i++) {
      switch (typeof(arguments[i])) {
        case 'string':
          argSelector = arguments[i];
          break;
        case 'object':
          argContainer = arguments[i];
          break;
        case 'boolean':
          argSingle = arguments[i];
          break;
      }
    }
    selector = argSelector;
    container = argContainer || document.body;
    single = argSingle;

    var parents = [],
      getAncestors = function (element) {
        var parent = element.parentElement;
        if (!selector || parent.matches(selector)) {
          if (single) {
            return parent;
          } else {
            parents.push(parent);
          }
        }
        if (parent === container) {
          return single ? false : parents;
        }
        return getAncestors(parent);
      }
      ;
    return getAncestors(element);
  }

  /**
   * Check if an element is the parent of another element.
   *
   * isParent(parent, child)
   *
   * @param parent DOM-element
   * @param child DOM-element
   * @returns {boolean}
   */
  function isParent(parent, child) {
    var node = child.parentNode;
    while (node !== null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Add 1 or more values to an attribute.
   *
   * addAttributeValues(element, attributeName, values)
   *
   * @param element DOM-element
   * @param attributeName string
   * @param values mixed; string or array of strings
   */
  function addAttributeValues(element, attributeName, values) {
    values = Array.isArray(values) ? values : [values];

    var
      attributeVal = element.getAttribute(attributeName),
      currentVals = attributeVal ? attributeVal.split(' ') : [];

    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      if (currentVals.indexOf(value) === -1) {
        currentVals.push(value);
      }
    }
    element.setAttribute(attributeName, currentVals.join(' '));
  }

  /**
   * Remove one or more values from an attribute.
   *
   * removeAttributeValues(element, attributeName, values, keepEmptyAttribute)
   *
   * @param element DOM-element
   * @param attributeName string
   * @param values mixed; string or array of strings
   * @param keepEmptyAttribute bool
   */
  function removeAttributeValues(element, attributeName, values, keepEmptyAttribute) {
    var attributeVal = element.getAttribute(attributeName);
    if (attributeVal) {
      var
        expStart = '((^| )',
        expEnd = '(?= |$))';

      attributeVal = attributeVal.replace(new RegExp(Array.isArray(values) ?
        expStart + values.join(expEnd + '|' + expStart) + expEnd :
        expStart + values + expEnd, 'g'),
        '');

      if (keepEmptyAttribute || attributeVal) {
        element.setAttribute(attributeName, attributeVal);
      } else {
        element.removeAttribute(attributeName);
      }
    }
  }

  /**
   * Checks if an attribute has a value (word).
   *
   * hasAttributeValue(element, attributeName, value)
   *
   * @param element DOM-element
   * @param attributeName string
   * @param value string
   * @returns {boolean}
   */
  function hasAttributeValue(element, attributeName, value) {
    var attributeVal = element.getAttribute(attributeName);
    if (attributeVal) {
      var
        expStart = '((^| )',
        expEnd = '(?= |$))';

      return !!attributeVal.match(new RegExp(expStart + value + expEnd, 'g'));
    }
    return false;
  }

  /**
   * Get all radio-buttons belonging to a radio-button's group
   * @param radio DOM-Element radio element
   * @returns []
   */
  function getRadioGroup(radio) {
    // get the form for the radiobutton
    var
      form = getAncestors(radio, 'form', true) || // radiobutton is contained in a form
        document,
      name = radio.getAttribute('name');

    return [].slice.call(form.querySelectorAll('input[type="radio"][name="' + name + '"]'));
  }


  /**
   * Returns all focusable elements, ordered by tabindex
   * @param container DOM-Element; required
   * @param selector String selector for elements which are focusable; optionsl; default is 'a,frame,iframe,input:not([type=hidden]),select,textarea,button,*[tabindex]'
   * @returns {Array}
   */
  function fetchFocusables (container, selector) {
    selector = selector || 'a,frame,iframe,input:not([type=hidden]),select,textarea,button,*[tabindex]:not([tabindex="-1"])';
    return orderByTabindex(container.querySelectorAll(selector));

  }

  /**
   * @param focusables Array of Dom-Elements
   * @returns {Array}
   */
  function orderByTabindex (focusables) {
    var
      byTabindex = [],
      ordered = [];

    for (var i = 0; i < focusables.length; i++) {
      var
        focusable = focusables[i],
        tabindex = Math.max(0, focusable.getAttribute('tabindex') || 0);

      byTabindex[tabindex] = byTabindex[tabindex] || [];
      byTabindex[tabindex].push(focusable);
    }

    for (var j in byTabindex) {
      for (var k in byTabindex[j]) {
        ordered.push(byTabindex[j][k]);
      }
    }

    return ordered;
  }

  /**
   * Return not disabled, visible, tabable-radio ordered by the specified tab-direction
   * @param focusables Array of DOM-Elements; required
   * @param tabDirection int; optional; tab-direction (-1 or 1); default is 1
   * @returns {Array} or false
   */
  function getFocusables (focusables, tabDirection) {
    // prepare argument
    tabDirection = typeof(tabDirection) === 'undefined' ? 1 : tabDirection;

    var
      filtered = [],
      doneRadios = []; // already processed radio-buttons

    function evalCandidate(candidate) {
      if (candidate.matches(':not([disabled])') && (candidate.offsetWidth || candidate.offsetHeight)) { // not disabled & visible
        if (candidate.matches('input[type="radio"]')) { // remove all radio buttons which are not tabable
          if (doneRadios.indexOf(candidate) === -1) { // group of this radio not processed yet
            // get radio-group
            var
              radioGroup = getRadioGroup(candidate),
              focusableRadio = null;

            doneRadios = doneRadios.concat(radioGroup);

            // get tabable radios of the group (checked or first&last of group)
            for (var j = 0; j < radioGroup.length; j++) {
              var radio = radioGroup[j];
              if (radio.checked) {
                focusableRadio = radio;
                break;
              }
            }
            if (!focusableRadio) {
              focusableRadio = tabDirection === -1 ? radioGroup[radioGroup.length-1] : radioGroup[0]; // default is tabable in tab-direction!!!
            }
            return focusableRadio;
          }

        } else {
          return candidate;
        }

        return false;
      }
    }

    // remove all elements which are not tabable
    if (tabDirection === 1) {
      for (var i = 0; i < focusables.length; i++) {
        var tabable = evalCandidate(focusables[i]);
        if (tabable) {
          filtered.push(tabable);
        }
      }
    } else {
      for (var j = focusables.length-1; j >= 0; j--) {
        var backwardTabable = evalCandidate(focusables[j]);
        if (backwardTabable) {
          filtered.push(backwardTabable);
        }
      }
    }

    return filtered;
  }

  /**
   *
   * @param container DOM-Element
   * @param fn(container, focusables) Function returning the element to focus
   */
  function focusInside(container, fn) {
    var
      toFocus = null,
      focusables = getFocusables(fetchFocusables(container));

    if (typeof fn === 'function') {
      toFocus = fn(container, focusables);
    }
    if (!toFocus && focusables.length) {
      toFocus = focusables[0];
    }
    if (!toFocus) {
      var containerTabindex = container.getAttribute('tabindex');
      if (!containerTabindex) {
        container.setAttribute('tabindex', '-1');
      }
      toFocus = container;
    }

    toFocus.focus();
  }

  /*
   ---------------
   api
   ---------------
   */

  return {
    getElementById: getElementById,
    getId: getId,
    getAncestors: getAncestors,
    isParent: isParent,
    addAttributeValues: addAttributeValues,
    removeAttributeValues: removeAttributeValues,
    hasAttributeValue: hasAttributeValue,
    fetchFocusables: fetchFocusables,
    orderByTabindex: orderByTabindex,
    getFocusables: getFocusables,
    focusInside: focusInside
  };

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meTools.fn.event', [
      'meTools.fn.variable'
    ], factory);
  } else if(typeof exports === 'object') {
    var fnVariable = require('./variable');
    if (typeof module === 'object') {
      module.exports = factory(fnVariable);
    } else {
      exports['meTools.fn.event'] = factory(fnVariable);
    }
  } else {
    root.meTools = root.meTools || {};
    root.meTools.fn = root.meTools.fn || {};
    root.meTools.fn.event = factory(root.meTools.fn.variable);
  }
}(this, function (fnVariable) {

  /*
   ---------------
   functions
   ---------------
   */

  /**
   * Add an event-listener and register it to an instance.
   * The instance will get a property 'registeredEvents' storing the registered events.
   *
   * registerEvent(scope, target, type, fn [, capture])
   *
   * @param scope object; instance to register the event to
   * @param target DOM object; event target
   * @param type string; event name
   * @param fn function; event handler
   * @param capture boolean; optional; capture the event; default is false
   */
  function registerEvent(scope, target, type, fn, capture) {

    capture = capture || false;

    var
      registeredEvents = scope.registeredEvents = scope.registeredEvents || {},
      typeListeners = registeredEvents[type] = registeredEvents[type] || [],
      targetTypeHandlers = false
      ;

    for (var i in typeListeners) {
      var typeHandlers = typeListeners[i];
      if (typeHandlers.tg === target) {
        targetTypeHandlers = typeHandlers;
        break;
      }
    }

    if (!targetTypeHandlers) {
      targetTypeHandlers = {
        tg: target,
        fns: []
      };
      typeListeners.push(targetTypeHandlers);
    }

    targetTypeHandlers.fns.push([fn, capture]);

    target.addEventListener(type, fn, capture);

  }

  /**
   * Remove (an) event-listener(s), previously registered to an instance.
   *
   * unregisterEvent(scope [, target] [, type] [, fn] [, capture])
   *
   * @param scope object; instance the event was registered to
   * @param target DOM object; optional; event target; if not set, matching events will be removed on all targets
   * @param type string; optional; event name; if not set, all event-types will be removed
   * @param fn function; optional; event handler; if not set, all event-handlers will be removed
   * @param capture boolean; optional; if not set, captured & not-captured events are removed, if true only captured events are removed, if false only not-captured events are removed
   */
  function unregisterEvent(scope, target, type, fn, capture) {
    if (!scope.registeredEvents) {
      return;
    }
    var registeredEvents = scope.registeredEvents;

    if (!type) {
      for (type in registeredEvents) {
        unregisterEvent(scope, target, type, fn, capture);
      }
      return;
    }

    if (!registeredEvents.hasOwnProperty(type)) {
      return;
    }
    var typeListeners = registeredEvents[type];

    if (!target) {
      var cTypeListeners = fnVariable.copyValues(typeListeners);
      while (cTypeListeners.length) {
        var typeListener = cTypeListeners.shift();
        unregisterEvent(scope, typeListener.tg, type, fn, capture);
      }
      return;
    }

    var fns = false,
      typeHandlers;
    for (var j in typeListeners) {
      typeHandlers = typeListeners[j];
      if (typeHandlers.tg === target) {
        fns = typeHandlers.fns;
        break;
      }
    }
    if (!fns) {
      return;
    }

    for (var k = 0; k < fns.length; k++) {
      var fnDef = fns[k];
      if ((typeof(fn) === 'undefined' || !fn || fn === fnDef[0]) &&
        (typeof(capture) === 'undefined' || capture === fnDef[1])) {
        fns.splice(k, 1);
        target.removeEventListener(type, fnDef[0], fnDef[1]);
        k--;
      }
    }

    // remove unused info
    if (!fns.length) {
      typeListeners.splice(j, 1);
    }
    if (!typeListeners.length) {
      delete registeredEvents[type];
    }

  }

  /**
   * Rate-limit the execution of a function (e.g. for events like resize and scroll).
   * Returns a new function, that when called repetitively, executes the original function no more than once every delay milliseconds.
   * (based on https://remysharp.com/2010/07/21/throttling-function-calls)
   *
   * throttle(fn [, threshhold] [, trailing] [, scope])
   *
   * @param fn function; original function to call
   * @param threshhold int; optional; delay (ms) - execute fn no more than once every delay milliseconds; default is 250
   * @param trailing boolean; optional; execute fn after the calls stopped; default is true
   * @param scope object; optional; instance the function should be applied to
   * @returns {Function}
   */
  function throttle(fn, threshhold, trailing, scope) {
    // prepare arguments
    threshhold = threshhold || 250;
    trailing = typeof(trailing) === 'undefined' ? true:trailing;
    scope = scope || this;

    var
      last,
      deferTimer = null;

    return function () {
      var
        now = +new Date(),
        args = arguments;

      if (last && now < last + threshhold) {
        if (trailing) {
          // hold on to it
          clearTimeout(deferTimer);
          deferTimer = setTimeout(function () {
            last = now;
            fn.apply(scope, args);
          }, threshhold);
        }

      } else {
        last = now;
        clearTimeout(deferTimer);
        fn.apply(scope, args);
      }
    };
  }

  /**
   * Coalesce multiple sequential calls into a single execution at either the beginning or end (e.g. for events like keydown).
   * Returns a new function, that when called repetitively, executes the original function just once per “bunch” of calls.
   *
   * debounce(fn [, pause] [, beginning] [, scope])
   *
   * @param fn function; original function to call
   * @param pause int; optional; min pause (ms) between bunches of calls; default is 250
   * @param beginning boolean; execute at the beginning of the call-bunch; default is false
   * @param scope object; optional; instance the function should be applied to
   * @returns {Function}
   */
  function debounce(fn, pause, beginning, scope) {
    // prepare arguments
    pause = pause || 250;
    scope = scope || this;

    var
      last,
      pauseTimer = null;

    return function () {
      var
        now = +new Date(),
        args = arguments;

      if (!beginning) {
        // defer a possible function call
        clearTimeout(pauseTimer);
        pauseTimer = setTimeout(function () {
          fn.apply(scope, args);
        }, pause);

      } else if (!last || now > last + pause) {
        fn.apply(scope, args);
      }

      last = now;
    };
  }

  /*
   ---------------
   api
   ---------------
   */

  return {
    registerEvent: registerEvent,
    unregisterEvent: unregisterEvent,
    throttle: throttle,
    debounce: debounce
  };

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('me-tools',[
      'meTools.fn.variable',
      'meTools.fn.element',
      'meTools.fn.event'
    ], factory);
  } else if(typeof exports === 'object') {
    var
      fnVariable = require('./fn/variable'),
      fnElement = require('./fn/element'),
      fnEvent = require('./fn/event');
    if (typeof module === 'object') {
      module.exports = factory(fnVariable, fnElement, fnEvent);
    } else {
      exports.meTools = factory(fnVariable, fnElement, fnEvent);
    }
  } else {
    var meTools = root.meTools;
    root.meTools = factory(meTools.fn.variable, meTools.fn.element, meTools.fn.event);
    for (var i in meTools) {
      root.meTools[i] = meTools[i];
    }
  }
}(this, function (fnVariable, fnElement, fnEvent) {
  var api = {};
  for (var i in arguments) {
    for (var j in arguments[i]) {
      api[j] = arguments[i][j];
    }
  }

  return api;

}));


/**
 * Uses classList - possibly use a polyfill for older browsers (http://caniuse.com/#feat=classlist)
 * Uses animationFrame - possibly use a polyfill for older browsers (http://caniuse.com/#feat=requestanimationframe)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('meShowTransition',['me-tools'], factory);
  } else if (typeof exports === 'object') {
    var
      meTools = require('me-tools');
    if (typeof module === 'object') {
      module.exports = factory(meTools);
    } else {
      exports.meShowTransition = factory(meTools);
    }
  } else {
    root.meShowTransition = factory(root.meTools);
  }
}(this, function (meTools) {

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
        afterHide: false,
        onDestroy: false,
      },
      transitionEndElement: false, // element to listen to the transitionend event on (default is the container); use this if you use transitions on more than 1 element on show/hide to define the element which ends the transitions
      ignoreChildTransitions: false, // transitionEnd event bubbles - only listen to transitionEnd directly on the container (or transitionEndElement)
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
   * @param container mixed; id or element; the container to show/hide
   * @param show boolean; optional; show the container immediately (without transitions) onInit; default is false
   * @param options object; optional; overwrite the default options
   */
  function meShowTransition(container, show, options) {

    var that = this;

    // prepare arguments
    if (typeof(show) !== 'boolean') {
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
    that.showTransitionStartAnimation = null;
    that.showTransitionEndTimeout = null;
    that.hideTransitionStartAnimation = null;
    that.hideTransitionEndTimeout = null;
    that.showing = false;
    that.hiding = false;
    that.hidden = false;

    return that;
  }

  function markShown() {
    var that = this;
    that.container.classList.add(that.options.indicators.shown);
    that.container.setAttribute('aria-hidden', 'false');

    return that;
  }

  function markHidden() {
    var that = this;
    that.container.classList.remove(that.options.indicators.shown);
    that.container.setAttribute('aria-hidden', 'true');

    return that;
  }

  function showEnd(immediate) { // end of show
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

    that.showing = false;

    return that;
  }

  function hideEnd(immediate) { // end of hide
    immediate = immediate || false;
    var
      that = this,
      container = that.container,
      afterHideFn = that.options.callbacks.afterHide;

    // hide container
    container.style.display = 'none';
    that.hiding = false;
    that.hidden = true;

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

  function showTransitionEnd() {
    var
      that = this,
      options = that.options,
      container = that.container,
      afterTransitionFn = options.callbacks.afterShowTransition,
      transitionEndElement = that.options.transitionEndElement
      ;

    // clear listeners
    window.cancelAnimationFrame(that.showTransitionStartAnimation);
    clearTimeout(that.showTransitionEndTimeout);
    meTools.unregisterEvent(that, transitionEndElement, 'webkitTransitionEnd');
    meTools.unregisterEvent(that, transitionEndElement, 'transitionend');

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

  function hideTransitionEnd() {
    var
      that = this,
      options = that.options,
      container = that.container,
      afterTransitionFn = options.callbacks.afterHideTransition,
      transitionEndElement = that.options.transitionEndElement
      ;

    // clear listeners
    window.cancelAnimationFrame(that.hideTransitionStartAnimation);
    clearTimeout(that.hideTransitionEndTimeout);
    meTools.unregisterEvent(that, transitionEndElement, 'webkitTransitionEnd');
    meTools.unregisterEvent(that, transitionEndElement, 'transitionend');

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
      options = that.options,
      container = that.container,
      transitionEndElement = options.transitionEndElement || container;

    function _showTransitionEnd(event) {
      if (!options.ignoreChildTransitions || !event || !event.target || event.target === transitionEndElement) {
        showTransitionEnd.call(that);
      }
    }

    if (immediate || that.canShow()) {
      var
        callbacks = options.callbacks,
        beforeShowFn = callbacks.beforeShow,
        beforeTransitionFn = callbacks.beforeShowTransition,

        indicators = options.indicators;

      // remember that we are showing
      that.showing = true;

      // end possible hide-transition
      if (that.hiding) {
        hideTransitionEnd.call(that);
      }

      that.hidden = false;

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

        // init transition-end-handling
        meTools.registerEvent(that, transitionEndElement, 'webkitTransitionEnd', _showTransitionEnd);
        meTools.registerEvent(that, transitionEndElement, 'transitionend', _showTransitionEnd);
        // set a transition-timeout in case the end-event doesn't fire
        that.showTransitionEndTimeout = setTimeout(_showTransitionEnd, options.transitionMaxTime);

        that.showTransitionStartAnimation = window.requestAnimationFrame(function () { // wait 2 ticks for the browser to apply the visibility
          that.showTransitionStartAnimation = window.requestAnimationFrame(function () {

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

          });
        });

      } else { // immediate show
        markShown.call(that);
        showEnd.call(that, immediate);
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
      options = that.options,
      container = that.container,
      transitionEndElement = options.transitionEndElement || container;

    function _hideTransitionEnd(event) {
      if (!options.ignoreChildTransitions || !event || !event.target || event.target === transitionEndElement) {
        hideTransitionEnd.call(that);
      }
    }

    if (immediate || !that.canShow()) {
      var
        callbacks = options.callbacks,
        beforeHideFn = callbacks.beforeHide,
        beforeTransitionFn = callbacks.beforeHideTransition,

        indicators = options.indicators;

      // remember that we are showing
      that.hiding = true;

      // end possible show-transition
      if (that.showing) {
        showTransitionEnd.call(that);
      }

      // before hide
      if (beforeHideFn) {
        beforeHideFn({
          container: container,
          immediate: immediate
        });
      }

      if (!immediate && options.transitionMaxTime) { // transition

        // init transition-end-handling
        meTools.registerEvent(that, transitionEndElement, 'webkitTransitionEnd', _hideTransitionEnd);
        meTools.registerEvent(that, transitionEndElement, 'transitionend', _hideTransitionEnd);
        // set a transition-timeout in case the end-event doesn't fire
        that.hideTransitionEndTimeout = setTimeout(_hideTransitionEnd, options.transitionMaxTime);

        that.hideTransitionStartAnimation = window.requestAnimationFrame(function () { // wait 2 ticks for the browser to apply beforeHideFn changes
          that.hideTransitionStartAnimation = window.requestAnimationFrame(function () {

            // before transition
            if (beforeTransitionFn) {
              beforeTransitionFn({
                container: container,
                immediate: false
              });
            }

            // start show transition and listeners
            container.classList.add(indicators.hide);

          });
        });

      } else { // immediate hide
        hideEnd.call(that);
      }
    }

    return that;
  };

  /**
   * @returns {boolean} true if the component is in the process of hiding or hidden
   */
  meShowTransition.prototype.canShow = function () {
    return (this.hiding || this.hidden);
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
    clearTimeout(that.showTransitionEndTimeout);
    clearTimeout(that.hideTransitionEndTimeout);
    meTools.unregisterEvent(that);

    // remove added classes
    for (var i in indicators) {
      container.classList.remove(indicators[i]);
    }

    // remove styles
    container.style.display = '';

    // remove added attributes
    container.removeAttribute('aria-hidden');

    if (that.options.callbacks.onDestroy) {
      that.options.callbacks.onDestroy({
        container: container,
      });
    }

    // reset properties and remove all references
    initProperties.call(that);

    return null;
  };

  return meShowTransition;

}));

/*
 * classList.js: Cross-browser full element.classList implementation.
 * 2014-07-23
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/

if ("document" in self) {

// Full polyfill for browsers with no classList support
  if (!("classList" in document.createElement("_"))) {

    (function (view) {

      "use strict";

      if (!('Element' in view)) return;

      var
        classListProp = "classList"
        , protoProp = "prototype"
        , elemCtrProto = view.Element[protoProp]
        , objCtr = Object
        , strTrim = String[protoProp].trim || function () {
            return this.replace(/^\s+|\s+$/g, "");
          }
        , arrIndexOf = Array[protoProp].indexOf || function (item) {
            var
              i = 0
              , len = this.length
              ;
            for (; i < len; i++) {
              if (i in this && this[i] === item) {
                return i;
              }
            }
            return -1;
          }
      // Vendors: please allow content code to instantiate DOMExceptions
        , DOMEx = function (type, message) {
          this.name = type;
          this.code = DOMException[type];
          this.message = message;
        }
        , checkTokenAndGetIndex = function (classList, token) {
          if (token === "") {
            throw new DOMEx(
              "SYNTAX_ERR"
              , "An invalid or illegal string was specified"
            );
          }
          if (/\s/.test(token)) {
            throw new DOMEx(
              "INVALID_CHARACTER_ERR"
              , "String contains an invalid character"
            );
          }
          return arrIndexOf.call(classList, token);
        }
        , ClassList = function (elem) {
          var
            trimmedClasses = strTrim.call(elem.getAttribute("class") || "")
            , classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
            , i = 0
            , len = classes.length
            ;
          for (; i < len; i++) {
            this.push(classes[i]);
          }
          this._updateClassName = function () {
            elem.setAttribute("class", this.toString());
          };
        }
        , classListProto = ClassList[protoProp] = []
        , classListGetter = function () {
          return new ClassList(this);
        }
        ;
// Most DOMException implementations don't allow calling DOMException's toString()
// on non-DOMExceptions. Error's toString() is sufficient here.
      DOMEx[protoProp] = Error[protoProp];
      classListProto.item = function (i) {
        return this[i] || null;
      };
      classListProto.contains = function (token) {
        token += "";
        return checkTokenAndGetIndex(this, token) !== -1;
      };
      classListProto.add = function () {
        var
          tokens = arguments
          , i = 0
          , l = tokens.length
          , token
          , updated = false
          ;
        do {
          token = tokens[i] + "";
          if (checkTokenAndGetIndex(this, token) === -1) {
            this.push(token);
            updated = true;
          }
        }
        while (++i < l);

        if (updated) {
          this._updateClassName();
        }
      };
      classListProto.remove = function () {
        var
          tokens = arguments
          , i = 0
          , l = tokens.length
          , token
          , updated = false
          , index
          ;
        do {
          token = tokens[i] + "";
          index = checkTokenAndGetIndex(this, token);
          while (index !== -1) {
            this.splice(index, 1);
            updated = true;
            index = checkTokenAndGetIndex(this, token);
          }
        }
        while (++i < l);

        if (updated) {
          this._updateClassName();
        }
      };
      classListProto.toggle = function (token, force) {
        token += "";

        var
          result = this.contains(token)
          , method = result ?
          force !== true && "remove"
            :
          force !== false && "add"
          ;

        if (method) {
          this[method](token);
        }

        if (force === true || force === false) {
          return force;
        } else {
          return !result;
        }
      };
      classListProto.toString = function () {
        return this.join(" ");
      };

      if (objCtr.defineProperty) {
        var classListPropDesc = {
          get: classListGetter
          , enumerable: true
          , configurable: true
        };
        try {
          objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
        } catch (ex) { // IE 8 doesn't support enumerable:true
          if (ex.number === -0x7FF5EC54) {
            classListPropDesc.enumerable = false;
            objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
          }
        }
      } else if (objCtr[protoProp].__defineGetter__) {
        elemCtrProto.__defineGetter__(classListProp, classListGetter);
      }

    }(self));

  } else {
// There is full or partial native classList support, so just check if we need
// to normalize the add/remove and toggle APIs.

    (function () {
      "use strict";

      var testElement = document.createElement("_");

      testElement.classList.add("c1", "c2");

      // Polyfill for IE 10/11 and Firefox <26, where classList.add and
      // classList.remove exist but support only one argument at a time.
      if (!testElement.classList.contains("c2")) {
        var createMethod = function(method) {
          var original = DOMTokenList.prototype[method];

          DOMTokenList.prototype[method] = function(token) {
            var i, len = arguments.length;

            for (i = 0; i < len; i++) {
              token = arguments[i];
              original.call(this, token);
            }
          };
        };
        createMethod('add');
        createMethod('remove');
      }

      testElement.classList.toggle("c3", false);

      // Polyfill for IE 10 and Firefox <24, where classList.toggle does not
      // support the second argument.
      if (testElement.classList.contains("c3")) {
        var _toggle = DOMTokenList.prototype.toggle;

        DOMTokenList.prototype.toggle = function(token, force) {
          if (1 in arguments && !this.contains(token) === !force) {
            return force;
          } else {
            return _toggle.call(this, token);
          }
        };

      }

      testElement = null;
    }());

  }

};
define("classListPolyfill", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.classListPolyfill;
    };
}(this)));

/***********************************************************************************************************************
 * ANIMATION FRAME
 * Add window.requestAnimationFrame and window.cancelAnimationFrame to all browsers
 **********************************************************************************************************************/
// as described in http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/

(function(window) {
  var lastTime = 0;
  var vendors = ['webkit', 'moz', 'ms'];
  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame || !window.cancelAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() { callback(currTime + timeToCall); },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
}(window));


define("animationFramePolyfill", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.animationFramePolyfill;
    };
}(this)));



  return require('meShowTransition');
}));

