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
 * @fileoverview Provides a wrapper around the gmonkey API.
 */

goog.provide('e2e.ext.gmonkey');
goog.provide('e2e.ext.gmonkey.EmailAddressDescriptor');

goog.require('e2e.ext.utils.text');
goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.string');



/**
 * @constructor
 */
e2e.ext.gmonkey = function() {
  /**
   * Object storing response callbacks for API calls in progress
   * @type {!Object.<string, function(*)>}
   * @private
   */
  this.pendingCallbacks_ = {};
};


/**
 * An object describing an email entry in a to/from/cc/bcc fields.
 * @typedef {{name: (string|undefined), address: (string)}}
 */
e2e.ext.gmonkey.EmailAddressDescriptor;


/**
 * Delay needed to initialize message listeners in injected stub.
 * @type {number}
 * @const
 */
e2e.ext.gmonkey.STUB_INIT_DELAY = 50;


/**
 * True if Gmonkey object in web application is not available (this can only
 * be determined upon first callGmonkey_ invocation).
 * @type {?boolean}
 * @private
 */
e2e.ext.gmonkey.prototype.available_ = null;


/**
 * True if the stub script has been already injected.
 * @type {boolean}
 * @private
 */
e2e.ext.gmonkey.prototype.stubInjected_ = false;


/**
 * Port for communicating with the stub
 * @private
 * @type {MessagePort}
 */
e2e.ext.gmonkey.prototype.port_ = null;


/**
 * Active element that was sent with getSelectedContent(). Used to set a new
 * value to the element if native calls are used.
 * @type {Element}
 * @private
 */
e2e.ext.gmonkey.prototype.lastActiveElem_ = null;


/**
 * Calls Gmail's gmonkey API.
 * @param {string} call Name of the gmonkey API function to call.
 * @param {function(*)} callback The callback where the result should be
 *     passed.
 * @param {Object=} opt_args The arguments to pass to the gmonkey API.
 * @private
 */
e2e.ext.gmonkey.prototype.callGmonkey_ = function(call, callback, opt_args) {
  if (!this.port_) {
    // Inject stub and wait for it to call back with the port.
    this.injectStub_(goog.bind(function(port) {
      this.port_ = port;
      this.sendRequest_(call, callback, opt_args);
    }, this));
  } else {
    this.sendRequest_(call, callback, opt_args);
  }
};


/**
 * Creates and sends the request to the remote API port.
 * @param {string} call Name of the gmonkey API function to call.
 * @param {function(*)} callback The callback where the result should be
 *     passed.
 * @param {Object=} opt_args The arguments to pass to the gmonkey API.
 * @private
 */
e2e.ext.gmonkey.prototype.sendRequest_ = function(call, callback, opt_args) {
  var requestId;
  var port = this.port_;

  do {
    requestId = goog.string.getRandomString();
  } while (goog.object.containsKey(this.pendingCallbacks_, requestId));
  this.pendingCallbacks_[requestId] = callback;

  var request = {
    id: requestId,
    call: call,
    args: opt_args || {}
  };
  port.postMessage(request);
};


/**
 * Injects stub script into the webmail DOM.
 * @param {function(MessagePort)} onPortReadyCallback
 *     Callback to run when the two-way communication is established.
 * @private
 */
e2e.ext.gmonkey.prototype.injectStub_ = function(onPortReadyCallback) {
  if (this.stubInjected_) {
    return;
  }
  // Stub will connect back into the extension by connecting to a port sent
  // in a bootstrap postMessage.
  // In case the extension is restarted within document lifetime, the old port
  // will cease to work and the new gmonkey will start a new channel.
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('gmonkeystub.js');
  document.documentElement.appendChild(script);
  this.stubInjected_ = true;
  var channel = new MessageChannel();
  var initChannelListener = goog.bind(function(msgEvent) {
    if (msgEvent.data.api == 'e2e-init') {
      msgEvent.target.addEventListener('message',
          goog.bind(this.processStubResponse_, this));
      channel.port1.removeEventListener('message', initChannelListener);
      onPortReadyCallback(msgEvent.target);
    }
  }, this);

  // TODO(koto): handle timeouts gracefully
  channel.port1.addEventListener('message', initChannelListener, false);
  channel.port1.start();
  // Bootstrap the channel.
  setTimeout(function() {
    window.postMessage({
      api: 'e2e-init'
    }, window.location.origin, [channel.port2]);
  }, e2e.ext.gmonkey.STUB_INIT_DELAY);
};


/**
 * Processes response from an API request sent to stub.
 * @param  {MessageEvent} event Event sent over MessageChannel from stub.
 * @private
 */
e2e.ext.gmonkey.prototype.processStubResponse_ = function(event) {
  try {
    var response =
        /** @type {{api:string,result:*,requestId:string}} */ (event.data);
    if (response.api != 'gmonkey' ||
        !goog.object.containsKey(this.pendingCallbacks_, response.requestId)) {
      return;
    }
    var responseCallback = this.pendingCallbacks_[response.requestId];
    delete this.pendingCallbacks_[response.requestId];
    responseCallback(response.result);
  } catch (e) {
    return;
  }
};


/**
 * Checks if current web application has a gmonkey object available. Caches
 * the check in internal variable.
 * @param {function(boolean)} callback Function to call with the check results.
 */
e2e.ext.gmonkey.prototype.isAvailable = function(callback) {
  if (goog.isDefAndNotNull(this.available_)) {
    callback(/** @type {boolean} */ (this.available_));
    return;
  }
  if (e2e.ext.utils.text.isGmailOrigin(window.location.origin)) {
    this.callGmonkey_('isGmonkeyAvailable', goog.bind(function(result) {
      this.available_ = /** @type {boolean} */ (result);
      callback(this.available_);
    }, this));
  } else {
    this.available_ = false;
    callback(this.available_);
  }
};


/**
 * Extracts valid email addresses out of a string with comma-separated full
 *  email labels (e.g. "John Smith" <john@example.com>, Second
 *  <second@example.org>).
 * @param {!Array.<e2e.ext.gmonkey.EmailAddressDescriptor>} descriptors The full
 *     email address descriptors
 * @return {!Array.<string>} The extracted valid email addresses.
 * @private
 */
e2e.ext.gmonkey.getEmailsFromAddressDescriptors_ = function(descriptors) {
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
 * @return {!Array.<e2e.ext.gmonkey.EmailAddressDescriptor>} List of recipients
 *     with valid e-mail addresses
 * @private
 */
e2e.ext.gmonkey.getAddressDescriptorsFromEmails_ = function(recipients) {
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
 * Gets the last selected message in Gmail.
 * @param {!function(string=,string=)} callback The callback where the element
 *     containing the last selected message should be passed.
 * @expose
 */
e2e.ext.gmonkey.prototype.getCurrentMessage = function(callback) {
  this.callGmonkey_('getCurrentMessage', function(result) {
    if (!result) {
      callback(undefined, undefined);
    } else {
      callback(result.id, result.body);
    }
  });
};


/**
 * Gets the active draft in Gmail.
 * @param {!function(!Array.<string>,string)} callback The callback to process
 *     the results.
 * @expose
 * @suppress {missingProperties}
 */
e2e.ext.gmonkey.prototype.getActiveDraft = function(callback) {
  this.callGmonkey_('getActiveDraft', function(result) {
    var recipients = [];
    var body = '';
    if (goog.isObject(result)) {
      goog.array.extend(recipients,
          e2e.ext.gmonkey.getEmailsFromAddressDescriptors_(result['to']),
          e2e.ext.gmonkey.getEmailsFromAddressDescriptors_(result['cc']));
      body = result['body'];
    }
    callback(recipients, body);
  });
};


/**
 * Indicates if there is an active draft in Gmail.
 * @param {!function(boolean,*)} callback The callback to process the results.
 * @expose
 */
e2e.ext.gmonkey.prototype.hasActiveDraft = function(callback) {
  this.callGmonkey_(
      'hasActiveDraft', /** @type {!function(*)} */ (callback));
};


/**
 * Sets the contents of the active draft in Gmail.
 * @param {!Array.<string>} recipients E-mail addresses of the recipients of
 *     the message.
 * @param {string} msgBody The content body of the message.
 * @param {function(boolean)=} opt_callback Optional. A callback to invoke once
 *     the draft's contents have been set.
 * @expose
 */
e2e.ext.gmonkey.prototype.setActiveDraft = function(recipients, msgBody,
    opt_callback) {
  var callback = goog.nullFunction;
  if (goog.isFunction(opt_callback)) {
    callback = opt_callback;
  }
  this.callGmonkey_('setActiveDraft', callback, {
    to: e2e.ext.gmonkey.getAddressDescriptorsFromEmails_(recipients),
    body: msgBody
  });
};


/**
 * Returns currently selected content.
 * @param  {!function(!Array.<string>,string, boolean)} callback A callback
 *     to process the results.
 * @expose
 */
e2e.ext.gmonkey.prototype.getSelectedContent = function(callback) {
  this.isAvailable(goog.bind(function(available) {
    if (available) {
      this.getSelectedContentGmonkey_(callback);
    } else {
      this.getSelectedContentNative_(callback);
    }
  }, this));
};


/**
 * Returns currently selected content using Gmonkey API.
 * @param  {!function(!Array.<string>,string, boolean)} callback A callback to
 *     process the results.
 * @private
 */
e2e.ext.gmonkey.prototype.getSelectedContentGmonkey_ = function(callback) {
  this.hasActiveDraft(goog.bind(function(hasDraft) {
    if (hasDraft) {
      this.getActiveDraft(goog.bind(function(recipients, msgBody) {
        callback(recipients, msgBody, true);
      }, this));
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
      }, this));
    }
  }, this));
};


/**
 * Returns currently active element in the document.
 * @param  {!function(!Array.<string>,string, boolean)} callback A callback to
 *     process the results.
 * @private
 */
e2e.ext.gmonkey.prototype.getSelectedContentNative_ = function(callback) {
  var activeElem = this.getActiveElement_();
  var selection = this.getActiveSelection_();
  var canInject = this.isEditable_(activeElem);
  this.lastActiveElem_ = activeElem;
  if (selection.length == 0 && canInject) {
    selection = activeElem.innerText;
  }
  callback([], selection, canInject);
};


/**
 * Updates currently selected content.
 * @param  {!Array.<!string>} recipients E-mail addresses of recipients.
 * @param  {string} value Message content.
 * @param  {function(boolean)=} opt_callback Callback to call after content has
 *     been updated.
 */
e2e.ext.gmonkey.prototype.updateSelectedContent = function(recipients, value,
    opt_callback) {
  this.isAvailable(goog.bind(function(available) {
    if (available) {
      this.setActiveDraft(recipients, value, opt_callback);
    } else {
      var success = false;
      var elem = this.lastActiveElem_;
      try {
        if (elem) {
          elem.value = value;
          elem.innerText = value;
          success = true;
        }
      } catch (e) {
      }
      opt_callback(success);
    }
  }, this));
};


/**
 * Returns the element that is currently in focus on the page.
 * @return {Element} The active element on the page.
 * @private
 */
e2e.ext.gmonkey.prototype.getActiveElement_ = function() {
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
e2e.ext.gmonkey.prototype.getActiveSelection_ = function() {
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
e2e.ext.gmonkey.prototype.isEditable_ = function(elem) {
  return goog.isDef(elem.value) || elem.contentEditable == 'true';
};
