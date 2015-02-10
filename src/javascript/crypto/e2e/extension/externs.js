/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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

/**
 * @externs
 */



/**
 * The consolemessage BrowserEvent contains these fields:
 * e.level: int32, log severity level (for exception/info etc)
 * e.line: int32, line number
 * e.message: string, the console message
 * e.sourceId: string, source identifier (the ones seen in devtools)
 *
 * @constructor
 * @extends {Event}
 */
chrome.ConsoleMessageBrowserEvent = function() {};


/** @type {number} */
chrome.ConsoleMessageBrowserEvent.prototype.level;


/** @type {number} */
chrome.ConsoleMessageBrowserEvent.prototype.line;


/** @type {string} */
chrome.ConsoleMessageBrowserEvent.prototype.message;


/** @type {string} */
chrome.ConsoleMessageBrowserEvent.prototype.sourceId;



/**
 * Defines a new window browser event's methods for resolving what to do with
 * the pending new window.
 * @constructor
 */
chrome.NewWindowEvent.Window = function() {};


/** @type {function(!Webview)} */
chrome.NewWindowEvent.Window.prototype.attach;


/** @type {function()} */
chrome.NewWindowEvent.Window.prototype.discard;



/**
 * Defines a new window browser event.
 * @constructor
 * @extends {Event}
 */
chrome.NewWindowEvent = function() {};


/** @type {string} */
chrome.NewWindowEvent.prototype.targetUrl;


/** @type {string} */
chrome.NewWindowEvent.prototype.name;


/** @type {number} */
chrome.NewWindowEvent.prototype.initialWidth;


/** @type {number} */
chrome.NewWindowEvent.prototype.initialHeight;


/** @type {!chrome.NewWindowEvent.Window} */
chrome.NewWindowEvent.prototype.window;



/**
 * Like chrome.webRequest, but for webview tags.
 *
 * chrome.webRequest defined in chrome_extensions.js can't be
 * used because it's not a type.
 *
 * @constructor
 */
function WebviewWebRequest() {}


/** @type {WebRequestEvent} */
WebviewWebRequest.prototype.onBeforeSendHeaders;


/** @type {WebRequestEvent} */
WebviewWebRequest.prototype.onBeforeRequest;


/** @type {WebRequestEvent} */
WebviewWebRequest.prototype.onCompleted;


/** @type {WebRequestOnErrorOccurredEvent} */
WebviewWebRequest.prototype.onErrorOccurred;



/**
 * @constructor
 */
chrome.PermissionRequest = function() {};


/**
 * Allow the permission request.
 * @type {function()}
 */
chrome.PermissionRequest.prototype.allow;


/**
 * Deny the permission request. This is the default behavior if allow is not
 * called.
 * @type {function()}
 */
chrome.PermissionRequest.prototype.deny;



/**
 * Defines a permission request browser event.
 * @see http://developer.chrome.com/apps/tags/webview#event-permissionrequest
 * @constructor
 * @extends {Event}
 */
chrome.PermissionRequestEvent = function() {};


/**
 * The type of permission being requested. Enum of "media", "geolocation",
 * "pointerLock", "download", or "loadplugin" permission.
 * @type {string}
 */
chrome.PermissionRequestEvent.prototype.permission;


/**
 * An object which holds details of the requested permission.
 * @type {chrome.PermissionRequest}
 */
chrome.PermissionRequestEvent.prototype.request;


/**
 * The plugin's identifier string.
 * @type {string}
 */
chrome.PermissionRequestEvent.prototype.identifier;


/**
 * The plugin's display name.
 * @type {string}
 */
chrome.PermissionRequestEvent.prototype.name;


/**
 * The URL of the frame requesting access to user media.
 * @type {string}
 */
chrome.PermissionRequestEvent.prototype.url;



/**
 * Enable access to special APIs of webview DOM element.
 * @constructor
 * @extends {HTMLElement}
 */
function Webview() {}


/**
 * Injects JavaScript code into the guest page.
 * @param {{code: string}|{file: string}} details
 * @param {function(Object)=} opt_callback
 */
Webview.prototype.executeScript = function(details, opt_callback) {};


/**
 * Injects CSS into the guest page.
 * @param {{code: string}|{file: string}} details
 * @param {function(Object)=} opt_callback
 */
Webview.prototype.insertCSS = function(details, opt_callback) {};


/**
 * Forcibly kills the guest web page's renderer process.
 */
Webview.prototype.terminate = function() {};


/** @type {!Window} */
Webview.prototype.contentWindow;


/** @type {string} */
Webview.prototype.src;


/** @type {WebviewWebRequest} */
Webview.prototype.request;


/**
 * Gets the zoom factor (1 = 100%).
 * @param {function(number)=} opt_callback
 */
Webview.prototype.getZoom = function(opt_callback) {};


/**
 * Sets the zoom factor (1 = 100%).
 * @param {number} zoomFactor
 * @param {function()=} opt_callback
 */
Webview.prototype.setZoom = function(zoomFactor, opt_callback) {};
