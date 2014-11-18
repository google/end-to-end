/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Implements the website API for the extension.
 */

goog.provide('e2e.ext.WebsiteApi');
goog.provide('e2e.ext.WebsiteApi.EmailAddressDescriptor');

goog.require('e2e.ext.utils.text');
goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.string');



/**
 * @constructor
 */
e2e.ext.WebsiteApi = function() {
  /**
   * Object storing response callbacks for API calls in progress
   * @type {!Object.<string, {callback:function(*), errback:function(Error)}>}
   * @private
   */
  this.pendingCallbacks_ = {};
};


/**
 * An object describing an email entry in a to/from/cc/bcc fields.
 * @typedef {{name: (string|undefined), address: (string)}}
 */
e2e.ext.WebsiteApi.EmailAddressDescriptor;


/**
 * Delay needed to initialize message listeners in injected stub.
 * @type {number}
 * @const
 */
e2e.ext.WebsiteApi.STUB_INIT_DELAY = 50;


/**
 * Timeout for requests sent to website API connectors (in ms).
 * @type {number}
 * @const
 */
e2e.ext.WebsiteApi.REQUEST_TIMEOUT = 1000;


/**
 * Timeout for the bootstrap handler in the website to respond (in ms).
 * @type {number}
 * @const
 */
e2e.ext.WebsiteApi.BOOTSTRAP_TIMEOUT = 100;


/**
 * True if API object in web application is available, false otherwise.
 * This can only be determined upon the first call invocation.
 * @type {?boolean}
 * @private
 */
e2e.ext.WebsiteApi.prototype.apiAvailable_ = null;


/**
 * True if the stub script has been already injected.
 * @type {boolean}
 * @private
 */
e2e.ext.WebsiteApi.prototype.stubInjected_ = false;


/**
 * Port for communicating with the stub
 * @private
 * @type {MessagePort}
 */
e2e.ext.WebsiteApi.prototype.port_ = null;


/**
 * Active element that was sent with getSelectedContent(). Used to set a new
 * value to the element if DOM calls are used.
 * @type {Element}
 * @private
 */
e2e.ext.WebsiteApi.prototype.lastActiveElement_ = null;


/**
 * Checks if the current web application has the API object available, trying to
 * establishing the connection at the first call.
 * Caches the check in internal variable.
 * @param {function(boolean)} callback Function to call with the check results.
 * @private
 */
e2e.ext.WebsiteApi.prototype.isApiAvailable_ = function(callback) {
  if (this.apiAvailable_ === null) {
    // Send bootstrap message and wait for the callback with the port.
    this.createConnection_(callback);
  } else {
    callback(this.apiAvailable_);
  }
};


/**
 * Creates a connection between this object (executing in E2E content script)
 * and a web application.
 * Determines the best method of connection based on current origin.
 * Available methods are:
 *  - inject the stub implementing the API into the website
 *  - send a postMessage, assuming the implementation is already present
 * @param {function(boolean)} onPortReadyCallback
 *     Callback to run when the two-way communication is established.
 * @private
 */
e2e.ext.WebsiteApi.prototype.createConnection_ = function(onPortReadyCallback) {
  var websiteOrigin = window.location.origin;
  if (e2e.ext.utils.text.isGmailOrigin(websiteOrigin)) {
    this.bootstrapChannelWithStub_('gmonkeystub.js', onPortReadyCallback);
  } else if (this.supportsApi_(websiteOrigin)) {
    this.bootstrapChannel_(onPortReadyCallback);
  } else {
    this.apiAvailable_ = false;  // Fall back to DOM methods
    onPortReadyCallback(this.apiAvailable_);
  }
};


/**
 * Indicates if the current web application, hosted under given origin, has
 *     support for the Website API already embedded.
 * @param  {string}  origin Current origin.
 * @return {boolean} true if API support has been detected.
 * @private
 */
e2e.ext.WebsiteApi.prototype.supportsApi_ = function(origin) {
  return false;
};


/**
 * Creates and sends the request to the remote API port.
 * @param {string} call Name of the Website API function to call.
 * @param {function(...)} callback The callback where the result should be
 *     passed.
 * @param {function(Error)} errback The function that will be called upon error.
 * @param {Object=} opt_args The arguments to pass to the Website API.
 * @private
 */
e2e.ext.WebsiteApi.prototype.sendWebsiteRequest_ = function(call, callback,
    errback, opt_args) {
  var requestId;
  var port = this.port_;
  if (!port) {
    errback(new Error('Port is not available!'));
    return;
  }

  do {
    requestId = goog.string.getRandomString();
  } while (goog.object.containsKey(this.pendingCallbacks_, requestId));
  this.pendingCallbacks_[requestId] = {callback: callback, errback: errback};
  var request = {
    id: requestId,
    call: call,
    args: opt_args || {}
  };
  var timeoutEvent = {
    data: {
      error: 'Timeout occurred while processing the request.',
      requestId: requestId
    }
  };
  // Set a timeout for a function that would simulate an error response.
  // If the response was processed before the timeout, processWebsiteResponse_
  // will just silently bail out.
  setTimeout(goog.bind(this.processWebsiteResponse_, this, timeoutEvent),
      e2e.ext.WebsiteApi.REQUEST_TIMEOUT);
  port.postMessage(request);
};


/**
 * Injects stub script into the web application DOM that will connect back,
 * creating a channel to exchange Website API messages.
 * @param {string} stubFilename name of the stub to inject
 * @param {function(boolean)} onPortReadyCallback
 *     Callback to run when the two-way communication is established.
 * @private
 */
e2e.ext.WebsiteApi.prototype.bootstrapChannelWithStub_ = function(stubFilename,
    onPortReadyCallback) {
  if (this.stubInjected_) {
    onPortReadyCallback(/** @type {boolean} */ (this.apiAvailable_));
    return;
  }
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL(stubFilename);
  document.documentElement.appendChild(script);
  this.stubInjected_ = true;
  setTimeout(goog.bind(this.bootstrapChannel_, this, onPortReadyCallback),
      e2e.ext.WebsiteApi.STUB_INIT_DELAY);
};


/**
 * Bootstraps the MessageChannel between the web application and this object.
 * @param {function(boolean)} onPortReadyCallback Callback to run when the
 *     two-way communication is established.
 * @private
 */
e2e.ext.WebsiteApi.prototype.bootstrapChannel_ = function(onPortReadyCallback) {
  // Code in the web application will phone home by connecting to a port sent
  // in a bootstrap postMessage.
  // In case the extension is restarted within document lifetime, the old port
  // will cease to work and the new object will start a new channel.
  if (!goog.global.MessageChannel) { // no HTML5 MessageChannel support
    this.apiAvailable_ = false;
    onPortReadyCallback(this.apiAvailable_);
    return;
  }
  var channel = new MessageChannel();
  var bootstrapReceived = false;
  var initChannelListener = goog.bind(function(msgEvent) {
    if (msgEvent.data.api == 'e2e-init' && msgEvent.data.version == 1) {
      channel.port1.removeEventListener('message', initChannelListener);
      if (bootstrapReceived) {
        return;
      }
      bootstrapReceived = true;
      this.port_ = msgEvent.target;
      this.apiAvailable_ = msgEvent.data.available;
      if (msgEvent.target) {
        msgEvent.target.addEventListener('message',
            goog.bind(this.processWebsiteResponse_, this));
      }
      onPortReadyCallback(this.apiAvailable_);
    }
  }, this);

  channel.port1.addEventListener('message', initChannelListener, false);
  channel.port1.start();
  this.sendBootstrap_(channel.port2);
  // Set a timeout for a function that would simulate an 'api not available'
  // response. If the response was processed before the timeout,
  // initChannelListener will just silently bail out.
  var timeoutEvent = {
    data: {
      api: 'e2e-init',
      version: 1,
      available: false
    },
    target: null
  };
  setTimeout(goog.bind(initChannelListener, this, timeoutEvent),
      e2e.ext.WebsiteApi.BOOTSTRAP_TIMEOUT);
};


/**
 * Sends the bootstrap message.
 * @param  {MessagePort} port Port to send the bootstrap message to.
 * @private
 */
e2e.ext.WebsiteApi.prototype.sendBootstrap_ = function(port) {
  window.postMessage({
    api: 'e2e-init'
  }, window.location.origin, [port]);
};


/**
 * Processes response from an API request sent to the web application.
 * @param  {MessageEvent} event Event sent over MessageChannel from the web
 *     application.
 * @private
 * @return {boolean} True if response matched a request.
 */
e2e.ext.WebsiteApi.prototype.processWebsiteResponse_ = function(event) {
  var response =
      /** @type {{result:*,error:*,requestId:string}} */ (event.data);
  if (!goog.object.containsKey(this.pendingCallbacks_, response.requestId)) {
    return false;
  }
  var callbacks = this.pendingCallbacks_[response.requestId];
  delete this.pendingCallbacks_[response.requestId];
  if (goog.object.containsKey(response, 'error')) {
    callbacks.errback(new Error(response.error));
  } else {
    callbacks.callback(response.result);
  }
  return true;
};


/**
 * Extracts valid email addresses out of a string with comma-separated full
 *  email labels (e.g. "John Smith" <john@example.com>, Second
 *  <second@example.org>).
 * @param {!Array.<e2e.ext.WebsiteApi.EmailAddressDescriptor>} descriptors The
 *     full email address descriptors
 * @return {!Array.<string>} The extracted valid email addresses.
 * @private
 */
e2e.ext.WebsiteApi.getEmailsFromAddressDescriptors_ = function(descriptors) {
  return goog.array.filter(
      goog.array.map(
          goog.array.map(descriptors || [], function(descriptor) {
            return descriptor['address'] || '';
          }),
          e2e.ext.utils.text.extractValidEmail),
      goog.isDefAndNotNull);
};


/**
 * Extracts valid email addresses out of an array with full email labels
 * (e.g. "John Smith" <john@example.com>, Second <second@example.org>).
 * @param {!Array.<string>} recipients List of recipients
 * @return {!Array.<e2e.ext.WebsiteApi.EmailAddressDescriptor>} List of
 *     recipients with valid e-mail addresses.
 * @private
 */
e2e.ext.WebsiteApi.getAddressDescriptorsFromEmails_ = function(recipients) {
  var list = [];
  goog.array.forEach(recipients || [], function(recipient) {
    var address = e2e.ext.utils.text.extractValidEmail(recipient);
    if (address) {
      list.push({'name': undefined, 'address': address});
    }
  });
  return list;
};


/**
 * Gets the last selected message in the web application.
 * @param {!function(string=,string=)} callback The callback where the element
 *     containing the last selected message should be passed.
 * @param {function(Error)} errback The function that will be called upon error.
 * @expose
 */
e2e.ext.WebsiteApi.prototype.getCurrentMessage = function(callback, errback) {
  this.isApiAvailable_(goog.bind(function(available) {
    if (available) {
      this.sendWebsiteRequest_('getCurrentMessage', function(result) {
        if (!result) {
          callback(undefined, undefined);
        } else {
          callback(result.selector, result.body);
        }
      }, errback);
    } else {
      callback(undefined, undefined); // Not implemented
    }
  }, this));
};


/**
 * Gets the active draft in the web application.
 * @param {!function(!Array.<string>,string)} callback The callback to process
 *     the results.
 * @param {function(Error)} errback The function that will be called upon error.
 * @suppress {missingProperties}
 * @private
 */
e2e.ext.WebsiteApi.prototype.getActiveDraft_ = function(callback, errback) {
  this.sendWebsiteRequest_('getActiveDraft', function(result) {
    var recipients = [];
    var body = '';
    if (goog.isObject(result)) {
      goog.array.extend(recipients,
          e2e.ext.WebsiteApi.getEmailsFromAddressDescriptors_(result['to']),
          e2e.ext.WebsiteApi.getEmailsFromAddressDescriptors_(result['cc']));
      body = result['body'];
    }
    callback(recipients, body);
  }, errback);
};


/**
 * Indicates if there is an active draft in the web application.
 * @param {!function(boolean)} callback The callback to process the results.
 * @param {function(Error)} errback The function that will be called upon error.
 * @private
 */
e2e.ext.WebsiteApi.prototype.hasActiveDraft_ = function(callback, errback) {
  this.sendWebsiteRequest_('hasActiveDraft', callback, errback);
};


/**
 * Sets the contents of the active draft in the web application.
 * @param {!Array.<string>} recipients E-mail addresses of the recipients of
 *     the message.
 * @param {string} msgBody The content body of the message.
 * @param {function(boolean)} callback A callback to invoke once the draft's
 *     contents have been set.
 * @param {function(Error)} errback The function that will be called upon error.
 * @private
 */
e2e.ext.WebsiteApi.prototype.setActiveDraft_ = function(recipients, msgBody,
    callback, errback) {
  this.sendWebsiteRequest_('setActiveDraft', callback, errback, {
    to: e2e.ext.WebsiteApi.getAddressDescriptorsFromEmails_(recipients),
    body: msgBody
  });
};


/**
 * Returns currently selected content.
 * @param  {!function(!Array.<string>,string, boolean)} callback A callback
 *     to process the results.
 * @param {function(Error)} errback The function that will be called upon error.
 * @expose
 */
e2e.ext.WebsiteApi.prototype.getSelectedContent = function(callback, errback) {
  this.isApiAvailable_(goog.bind(function(available) {
    if (available) {
      this.getSelectedContentWebsite_(callback, errback);
    } else {
      this.getSelectedContentDom_(callback, errback);
    }
  }, this));
};


/**
 * Returns currently selected content using Website API.
 * @param  {!function(!Array.<string>,string, boolean)} callback A callback to
 *     process the results.
 * @param {function(Error)} errback The function that will be called upon error.
 * @private
 */
e2e.ext.WebsiteApi.prototype.getSelectedContentWebsite_ = function(callback,
    errback) {
  this.hasActiveDraft_(goog.bind(function(hasDraft) {
    if (hasDraft) {
      this.getActiveDraft_(goog.bind(function(recipients, msgBody) {
        callback(recipients, msgBody, true);
      }, this), errback);
    } else {
      this.getCurrentMessage(goog.bind(function(messageElemId, messageBody) {
        var messageElem = document.getElementById(messageElemId);
        if (messageElem) {
          if (goog.isDef(messageElem.lookingGlass)) {
            messageBody = messageElem.lookingGlass.getOriginalContent();
          }
        } else if (!messageBody) {
          messageBody = this.getActiveSelection_();
        }
        callback([], messageBody, true);
      }, this), errback);
    }
  }, this), errback);
};


/**
 * Returns currently active element in the document.
 * @param  {!function(!Array.<string>,string, boolean)} callback A callback to
 *     process the results.
 * @param {function(Error)} errback The function that will be called upon error.
 * @private
 */
e2e.ext.WebsiteApi.prototype.getSelectedContentDom_ = function(callback,
    errback) {
  var activeElem = this.getActiveElement_();
  var selection = this.getActiveSelection_();
  var canInject = this.isEditable_(activeElem);
  this.lastActiveElement_ = activeElem;
  callback([], selection, canInject);
};


/**
 * Updates currently selected content.
 * @param  {!Array.<!string>} recipients E-mail addresses of recipients.
 * @param  {string} value Message content.
 * @param  {function(boolean)} callback Callback to call after content has
 *     been updated.
 * @param {function(Error)} errback The function that will be called upon error.
 */
e2e.ext.WebsiteApi.prototype.updateSelectedContent = function(recipients, value,
    callback, errback) {
  this.isApiAvailable_(goog.bind(function(available) {
    if (available) {
      this.setActiveDraft_(recipients, value, callback, errback);
    } else {
      this.updateSelectedContentDom_(value, callback, errback);
    }
  }, this));
};


/**
 * Updates content which was last returned by getSelectedContentDom_
 * @param  {string} value Message content.
 * @param  {function(boolean)} callback Callback to call after content has
 *     been updated.
 * @param {function(Error)} errback The function that will be called upon error.
 * @private
 */
e2e.ext.WebsiteApi.prototype.updateSelectedContentDom_ = function(value,
    callback, errback) {
  var success = false;
  var elem = this.lastActiveElement_;
  try {
    if (elem) {
      elem.value = value;
      elem.innerText = value;
      success = true;
    } else {
      errback(new Error('Active draft not found.'));
      return;
    }
  } catch (e) {
  }
  callback(success);
};


/**
 * Returns the element that is currently in focus on the page.
 * @return {Element} The active element on the page.
 * @private
 */
e2e.ext.WebsiteApi.prototype.getActiveElement_ = function() {
  var activeElement = document.activeElement;
  try {
    while (activeElement.contentDocument) {
      activeElement = activeElement.contentDocument.activeElement;
    }
  } catch (e) {}

  return activeElement;
};


/**
 * Returns the current selection that the user has made on the page, falling
 * back to active element value.
 * @return {!string} The current selection on the page.
 * @private
 */
e2e.ext.WebsiteApi.prototype.getActiveSelection_ = function() {
  var activeElement = this.getActiveElement_();
  var currentView = activeElement.ownerDocument.defaultView || window;
  return currentView.getSelection().toString() ||
      activeElement.value || activeElement.innerText || '';
};


/**
 * Indicates if an element is editable.
 * @param {Element} elem The element to check.
 * @return {boolean} True if the element is editable.
 * @private
 */
e2e.ext.WebsiteApi.prototype.isEditable_ = function(elem) {
  return goog.isDef(elem.value) || elem.contentEditable == 'true';
};
