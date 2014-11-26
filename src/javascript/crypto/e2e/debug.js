/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.provide('e2e.debug.Console');
goog.provide('e2e.debug.ConsoleHandler');



/**
 * A Console is a lightweight replacement for goog.debug.Logger,
 * used to record interesting events and information.
 *
 * Do not use this constructor directly, instead use
 * e2e.debug.Console.getConsole to create a console instance.
 *
 * Use the debug, info, warn and error methods in the console
 * instance similar to how you might use the same methods in
 * the Console API. Console instances rebind these methods to
 * the actual Console API when possible (and when requested by
 * the e2e.debug.Console.setLevel() method.) Otherwise, they are
 * bound to goog.nullFunction.
 *
 * You may replace this behavior by implementing an instance of
 * e2e.debug.ConsoleHandler and passing it to
 * e2e.debug.Console.setConsoleHandler()
 * Methods from this ConsoleHandler will then be bound to the
 * console instances, rather than from the Console API.
 *
 * TODO(user) use typedef instead of class
 * @see #getConsole
 * @see #setLevel
 * @see #setConsoleHandler
 *
 * @param {string} name is a dot-separated class name.
 * @constructor
 */
e2e.debug.Console = function(name) {
  /**
   * Holds the name of this console.
   * @private {string}
   */
  this.name_ = name;

  /**
   * log errors to the console.
   * @type {function(...):void}
   */
  this.error = goog.nullFunction;

  /**
   * log warnings to the console.
   * @type {function(...):void}
   */
  this.warn = goog.nullFunction;

  /**
   * log informational data to the console.
   * @type {function(...):void}
   */
  this.info = goog.nullFunction;

  /**
   * log debug messages to the console.
   * @type {function(...):void}
   */
  this.debug = goog.nullFunction;

  // Update log methods based on current log level,
  // and any ConsoleHandler
  e2e.debug.Console.rebindMethods_(this);
};


/**
 * The types of errors we want to log.
 * @enum {number}
 */
e2e.debug.Console.Level = {
  'OFF': Infinity,
  'ERROR': 1000,
  'WARN': 900,
  'INFO': 800,
  'DEBUG': 700
};


/**
 * holds the current global logging level setting,
 * defaults to OFF.
 * @private {!e2e.debug.Console.Level}
 */
e2e.debug.Console.globalLevel_ = e2e.debug.Console.Level.OFF;


/**
 * Global setting to set the Level at which we
 * actually dump messages to the console.
 * @param {!e2e.debug.Console.Level} level
 */
e2e.debug.Console.setLevel = function(level) {
  // Simple implementation rebinds methods on all the
  // console instances.
  e2e.debug.Console.globalLevel_ = level;
  e2e.debug.Console.rebindAll_();
};



/**
 * A ConsoleHandler interface allows you to replace the default
 * logging implementation. Logging methods from console
 * instances are bound to the corresponding method from the
 * provided ConsoleHandler.
 * @interface
 */
e2e.debug.ConsoleHandler = function() {};


/**
 * This will be bound to the console instances error method.
 * @param {string} name for the console instance
 * @param {...*} var_args
 */
e2e.debug.ConsoleHandler.prototype.handleError = goog.abstractMethod;


/**
 * This will be bound to the console instances warn method.
 * @param {string} name for the console instance
 * @param {...*} var_args
 */
e2e.debug.ConsoleHandler.prototype.handleWarn = goog.abstractMethod;


/**
 * This will be bound to the console instances info method.
 * @param {string} name for the console instance
 * @param {...*} var_args
 */
e2e.debug.ConsoleHandler.prototype.handleInfo = goog.abstractMethod;


/**
 * This will be bound to the console instances debug method.
 * @param {string} name for the console instance
 * @param {...*} var_args
 */
e2e.debug.ConsoleHandler.prototype.handleDebug = goog.abstractMethod;


/**
 * holds the current ConsoleHandler, if any.
 * @private {e2e.debug.ConsoleHandler}
 */
e2e.debug.Console.handler_ = null;


/**
 * This will replace the current way to handle log messages
 * from console instances.
 * @param {e2e.debug.ConsoleHandler} handler
 */
e2e.debug.Console.setHandler = function(handler) {
  e2e.debug.Console.handler_ = handler;
  e2e.debug.Console.rebindAll_();
};


/**
 * Update all our console instances with newly bound values.
 * @private
 */
e2e.debug.Console.rebindAll_ = function() {
  var consoles = e2e.debug.Console.consoles_;
  for (var name in consoles) {
    if (consoles.hasOwnProperty(name)) {
      e2e.debug.Console.rebindMethods_(consoles[name]);
    }
  }
};


/**
 * Given an console instance, rebinds its methods to any available
 * ConsoleHandler or Console API.
 * @param {!e2e.debug.Console} c
 * @private
 */
e2e.debug.Console.rebindMethods_ = function(c) {
  var handler = e2e.debug.Console.handler_;
  if (goog.isDefAndNotNull(handler)) {
    e2e.debug.Console.bindHandler_(c, handler);
  } else {
    e2e.debug.Console.bindDefault_(c);
  }
};


/**
 * Given a console instance and a handler, rebind its methods to
 * ones provided by the handler as necessary.
 * @param {!e2e.debug.Console} c
 * @param {!e2e.debug.ConsoleHandler} handler
 * @private
 */
e2e.debug.Console.bindHandler_ = function(c, handler) {
  var cur = e2e.debug.Console.globalLevel_;
  c.error = cur > e2e.debug.Console.Level.ERROR ?
      goog.nullFunction : goog.bind(handler.handleError, handler, c.name_);
  c.warn = cur > e2e.debug.Console.Level.WARN ?
      goog.nullFunction : goog.bind(handler.handleWarn, handler, c.name_);
  c.info = cur > e2e.debug.Console.Level.INFO ?
      goog.nullFunction : goog.bind(handler.handleInfo, handler, c.name_);
  c.debug = cur > e2e.debug.Console.Level.DEBUG ?
      goog.nullFunction : goog.bind(handler.handleDebug, handler, c.name_);
};


/**
 * Given a console instance, rebind its methods to the Console API
 * (if it exists) and as necessary.
 * @param {!e2e.debug.Console} c
 * @private
 */
e2e.debug.Console.bindDefault_ = function(c) {
  var cur = e2e.debug.Console.globalLevel_;
  c.error = e2e.debug.Console.bindDefaultMethod_(
      c.name_, 'error', cur > e2e.debug.Console.Level.ERROR);
  c.warn = e2e.debug.Console.bindDefaultMethod_(
      c.name_, 'warn', cur > e2e.debug.Console.Level.WARN);
  c.info = e2e.debug.Console.bindDefaultMethod_(
      c.name_, 'info', cur > e2e.debug.Console.Level.INFO);
  c.debug = e2e.debug.Console.bindDefaultMethod_(
      c.name_, 'debug', cur > e2e.debug.Console.Level.DEBUG);
};


/**
 * Returns a method bound to a Console API method if requested
 * (and one exists.)
 * @param {string} name is the name of the console instance
 * @param {string} methodName
 * @param {boolean} useNoop is true to use a do-nothing method.
 * @return {function(...):void}
 * @private
 */
e2e.debug.Console.bindDefaultMethod_ = function(name, methodName, useNoop) {
  var console = goog.global['console'];
  // Use a no-op if requested, or if we don't have a console.log
  if (useNoop ||
      !goog.isDefAndNotNull(console) ||
      !goog.isFunction(console['log'])) {
    return goog.nullFunction;
  }

  // Use actual method name if available, otherwise
  // use console.log
  var method = goog.isFunction(console[methodName]) ?
      console[methodName] : console['log'];
  return goog.bind(method, console, name);
};


/**
 * Finds the console for a given module.
 * @param {string} moduleName is a dot-separated class name.
 * @return {!e2e.debug.Console} a named console.
 */
e2e.debug.Console.getConsole = function(moduleName) {
  var ret = e2e.debug.Console.consoles_[moduleName];
  return ret || e2e.debug.Console.addConsole_(moduleName);
};


/**
 * Cache of consoles indexed by their name.
 * @private {!Object.<string,!e2e.debug.Console>}
 */
e2e.debug.Console.consoles_ = {};


/**
 * Creates and caches the named console.
 * @param {string} moduleName is a dot-separated class name.
 * @return {!e2e.debug.Console} a named console.
 * @private
 */
e2e.debug.Console.addConsole_ = function(moduleName) {
  var ret = new e2e.debug.Console(moduleName);
  e2e.debug.Console.consoles_[moduleName] = ret;
  return ret;
};


// Prevents closure from obfuscating this symbol, so we can set
// logging levels by calling it from a browser console debugger.
goog.exportSymbol(
    'e2e.debug.Console.setLevel', e2e.debug.Console.setLevel);
