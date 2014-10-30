/**
 * @license
 * Copyright 2014 Yahoo Inc. All rights reserved.
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
 * @fileoverview Provides a wrapper around the E2E bind API for interacting
 *   with Yahoo Mail.
 * @author jonathanpierce@outlook.com (Jonathan Pierce)
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.ext.e2ebind');

goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.constants.e2ebind.requestActions');
goog.require('e2e.ext.constants.e2ebind.responseActions');
goog.require('e2e.ext.ui.GlassWrapper');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.string');


goog.scope(function() {
var e2ebind = e2e.ext.e2ebind;
var ext = e2e.ext;
var constants = ext.constants;
var messages = ext.messages;
var utils = e2e.ext.utils;
var ui = ext.ui;


/**
 * True if e2ebind has been started.
 * @type {boolean}
 * @private
 */
e2ebind.started_ = false;


/**
 * Checks if e2ebind has been started.
 * @return {boolean}
 */
e2ebind.isStarted = function() {
  return e2ebind.started_;
};



/**
* Hash table for associating unique IDs with request/response pairs
* @constructor
* @private
*/
e2ebind.MessagingTable_ = function() {
  this.table = {};
};


/**
 * Generates a short, non-cryptographically random string.
 * @return {string}
 */
e2ebind.MessagingTable_.prototype.getRandomString = function() {
  return goog.string.getRandomString();
};


/**
 * Adds an entry to the hash table.
 * @param {string} action The action associated with the entry.
 * @param {function(messages.e2ebindResponse)=} opt_callback The callback
 *   associated with the entry.
 * @return {string} The hash value.
 */
e2ebind.MessagingTable_.prototype.add = function(action, opt_callback) {
  var hash;
  do {
    // Ensure uniqueness.
    hash = this.getRandomString();
  } while (this.table.hasOwnProperty(hash) && this.table[hash] !== null);
  this.table[hash] = {
    action: action,
    callback: opt_callback
  };
  return hash;
};


/**
* Retrieves the callback associated with a hash value and an action.
* @param {string} hash
* @param {string} action
* @return {{action:string,callback:(function(*)|undefined)}}
*/
e2ebind.MessagingTable_.prototype.get = function(hash, action) {
  var result = null;
  if (this.table.hasOwnProperty(hash) &&
      this.table[hash] !== null &&
      this.table[hash].action === action) {
    result = this.table[hash];
  }
  this.table[hash] = null;
  return result;
};


/**
 * onmessage event listener.
 * @param {!Object} response The message sent from the page via
 *   window.postMessage.
 * @private
 */
e2ebind.messageHandler_ = function(response) {
  try {
    var data = /** @type {messages.e2ebindRequest} */
        (window.JSON.parse(response.data));
    if (response.source !== window.self ||
        response.origin !== window.location.origin ||
        data.api !== 'e2ebind' || data.source === 'E2E') {
      return;
    }

    if (data.action.toUpperCase() in constants.e2ebind.requestActions) {
      e2ebind.handleProviderRequest_(data);
    } else if (
        data.action.toUpperCase() in constants.e2ebind.responseActions) {
      e2ebind.handleProviderResponse_(data);
    }
  } catch (e) {
    return;
  }
};


/**
 * Custom click event handler for e2ebind page elements.
 * @param {Element} e The element that was clicked.
 * @private
 */
e2ebind.clickHandler_ = function(e) {
  var elt = e.target;

  if (elt.id === constants.ElementId.E2EBIND_ICON) {
    e2ebind.sendExtensionRequest_({
      action: constants.Actions.GET_KEYRING_UNLOCKED
    }, goog.bind(function(response) {
      if (response.error || !response.content) {
        // Can't install compose glass if the keyring is locked
        window.alert(chrome.i18n.getMessage('glassKeyringLockedError'));
      } else {
        // Get the compose window associated with the clicked icon
        var composeElem = goog.dom.getAncestorByTagNameAndClass(elt,
                                                                'div',
                                                                'compose');
        var draft = {};
        draft.from = window.config.signer ? '<' + window.config.signer + '>' :
            '';

        e2ebind.hasDraft(goog.bind(function(hasDraftResult) {
          if (hasDraftResult) {
            e2ebind.getDraft(goog.bind(function(getDraftResult) {
              draft.body = e2e.openpgp.asciiArmor.
                  extractPgpBlock(getDraftResult.body);
              draft.to = getDraftResult.to;
              draft.cc = getDraftResult.cc;
              draft.bcc = getDraftResult.bcc;
              draft.subject = getDraftResult.subject;
              // Compose glass implementation will be in a future patch.
              //e2ebind.installComposeGlass_(composeElem, draft);
            }, this));
          } else {
            e2ebind.getCurrentMessage(goog.bind(function(result) {
              var DOMelem = document.querySelector(result.elem);
              if (result.text) {
                draft.body = result.text;
              } else if (DOMelem) {
                draft.body = e2e.openpgp.asciiArmor.extractPgpBlock(
                    goog.isDef(DOMelem.lookingGlass) ?
                    DOMelem.lookingGlass.getOriginalContent() :
                    DOMelem.innerText);
              }
              //e2ebind.installComposeGlass_(composeElem, draft);
            }, this));
          }
        }, this));
      }
    }, this));
  }
};


/**
* Start listening for responses and requests to/from the provider.
*/
e2ebind.start = function() {
  var uri = new goog.Uri(window.location.href);
  // Use the version of YMail that has the endtoend module included.
  if (utils.text.isYmailOrigin(window.location.href) &&
      !uri.getParameterValue('endtoend')) {
    uri.setParameterValue('endtoend', 1);
    uri.setParameterValue('composev3', 0);
    window.location.href = uri.toString();
    return;
  }

  e2ebind.messagingTable = new e2ebind.MessagingTable_();

  goog.events.listen(window, goog.events.EventType.CLICK,
                     e2ebind.clickHandler_, true);
  window.addEventListener('message', goog.bind(e2ebind.messageHandler_, this));
};


/**
 * Stops the e2ebind API
 * @private
 */
e2ebind.stop_ = function() {
  window.removeEventListener('message', goog.bind(e2ebind.messageHandler_,
                                                  this));
  e2ebind.messagingTable = undefined;
  e2ebind.started_ = false;
  window.config = {};
  window.valid = undefined;
  goog.events.unlisten(window, goog.events.EventType.CLICK,
                       e2ebind.clickHandler_);
};


/**
* Sends a request to the provider.
* @param {string} action The action requested.
* @param {Object} args The arguments to the action.
* @param {function(messages.e2ebindResponse)=} opt_callback The function to
*   callback with the response
*/
e2ebind.sendRequest = function(action, args, opt_callback) {
  if (!e2ebind.messagingTable) {
    return;
  }

  var hash = e2ebind.messagingTable.add(action, opt_callback);

  var reqObj = /** @type {messages.e2ebindRequest} */ ({
    api: 'e2ebind',
    source: 'E2E',
    action: action,
    args: args,
    hash: hash
  });

  window.postMessage(window.JSON.stringify(reqObj), window.location.origin);
};


/**
* Sends a response to a request from a provider
* @param {Object} result The result field of the response message
* @param {messages.e2ebindRequest} request The request we are responding to
* @param {boolean} success Whether or not the request was successful.
* @private
*/
e2ebind.sendResponse_ = function(result, request, success) {
  var returnObj = /** @type {messages.e2ebindResponse} */ ({
    api: 'e2ebind',
    result: result,
    success: success,
    action: request.action,
    hash: request.hash,
    source: 'E2E'
  });

  window.postMessage(window.JSON.stringify(returnObj), window.location.origin);
};


/**
* Handles a response to a request we sent
* @param {messages.e2ebindResponse} response The provider's response to a
*   request we sent.
* @private
*/
e2ebind.handleProviderResponse_ = function(response) {
  if (!e2ebind.messagingTable) {
    return;
  }

  var request = e2ebind.messagingTable.get(response.hash, response.action);

  if (!request) {
    return;
  }

  if (request.callback) {
    request.callback(response);
  }
};


/**
* Handle an incoming request from the provider.
* @param {messages.e2ebindRequest} request The request from the provider.
* @private
*/
e2ebind.handleProviderRequest_ = function(request) {
  var actions = constants.e2ebind.requestActions;

  if (request.action !== actions.START && !e2ebind.started_) {
    return;
  }

  var args = request.args;

  switch (request.action) {
    case actions.START:
      (function() {
        if (!e2ebind.started_) {
          // Note that we've attempted to start, and set the config
          e2ebind.started_ = true;
          window.config = {
            signer: String(args.signer),
            version: String(args.version),
            read_glass_enabled: Boolean(args.read_glass_enabled),
            compose_glass_enabled: Boolean(args.compose_glass_enabled)
          };

          // Verify the signer
          e2ebind.validateSigner_(String(args.signer), function(valid) {
            window.valid = valid;
            e2ebind.sendResponse_({valid: valid}, request, true);
          });
        } else {
          // We've already started.
          e2ebind.sendResponse_(null, request, false);
        }
      })();

      break;

    case actions.INSTALL_READ_GLASS:
      (function() {
        if (window.config.read_glass_enabled && args.messages && window.valid) {
          try {
            goog.array.forEach(args.messages, function(message) {
              // XXX: message.elem is a selector string, not a DOM element
              var DOMelem = document.querySelector(message.elem);
              e2ebind.installReadGlass_(DOMelem, message.text);
            });
            e2ebind.sendResponse_(null, request, true);
          } catch (ex) {
            e2ebind.sendResponse_(null, request, false);
          }
        }
      })();

      break;

    case actions.INSTALL_COMPOSE_GLASS:
      // TODO: Support compose glass in YMail
      break;

    case actions.SET_SIGNER:
      (function() {
        // validates and updates the signer/validity in E2E
        if (!args.signer) {
          return;
        }
        window.config.signer = String(args.signer);
        try {
          e2ebind.validateSigner_(String(args.signer), function(valid) {
            window.valid = valid;
            e2ebind.sendResponse_({valid: valid}, request, true);
          });
        } catch (ex) {
          e2ebind.sendResponse_(null, request, false);
        }
      })();

      break;

    case actions.VALIDATE_SIGNER:
      (function() {
        try {
          if (!args.signer) {
            return;
          }
          e2ebind.validateSigner_(String(args.signer), function(valid) {
            e2ebind.sendResponse_({valid: valid}, request, true);
          });
        } catch (ex) {
          e2ebind.sendResponse_(null, request, false);
        }
      })();

      break;

    case actions.VALIDATE_RECIPIENTS:
      (function() {
        try {
          if (!args.recipients || !(args.recipients instanceof Array) ||
              !window.valid) {
            return;
          }
          e2ebind.validateRecipients_(args.recipients, function(results) {
            e2ebind.sendResponse_({results: results}, request, true);
          });
        } catch (ex) {
          e2ebind.sendResponse_(null, request, false);
        }
      })();

      break;
  }
};


/**
* Installs a read looking glass in the page.
* @param {Element} elem  element to install the glass in
* @param {string=} opt_text Optional alternative text to elem's innerText
* @private
*/
e2ebind.installReadGlass_ = function(elem, opt_text) {
  var DOMelem = elem;

  if (!DOMelem) {
    throw 'Element not found.';
  }

  if (Boolean(DOMelem.lookingGlass)) {
    return;
  }

  var selectionBody = e2e.openpgp.asciiArmor.extractPgpBlock(
      opt_text ? opt_text : DOMelem.innerText);
  var action = utils.text.getPgpAction(selectionBody, true);

  if (action == constants.Actions.DECRYPT_VERIFY) {
    var glassWrapper = new ui.GlassWrapper(DOMelem, opt_text);
    window.helper.registerDisposable(glassWrapper);
    glassWrapper.installGlass();
  }
};


/**
* Gets the currently selected message, if any, from the provider
* @param {!function(Object)} callback The callback to call with the result
*/
e2ebind.getCurrentMessage = function(callback) {
  e2ebind.sendRequest(constants.e2ebind.responseActions.GET_CURRENT_MESSAGE,
                      null, function(data) {
        var elem;
        var text;

        if (data.result && data.success) {
          var result = data.result;
          elem = result.elem;
          text = result.text;
        }

        callback({elem: elem, text: text});
      });
};


/**
* Gets the current draft/compose from the provider.
* @param {!function(Object)} callback - The callback to call with the result
*/
e2ebind.getDraft = function(callback) {
  e2ebind.sendRequest(constants.e2ebind.responseActions.GET_DRAFT, null,
                      function(data) {
        var result = null;

        if (data.success) {
          result = data.result;
        }

        callback(result);
      });
};


/**
 * Indicates if there is an active draft in the provider.
 * @param {!function(boolean)} callback The callback where the active draft
 *     information should be passed.
 */
e2ebind.hasDraft = function(callback) {
  e2ebind.sendRequest(constants.e2ebind.responseActions.HAS_DRAFT, null,
                      function(data) {
        var result = false;

        if (data.success && data.result.has_draft) {
          result = true;
        }

        callback(result);
      });
};


/**
* Sets the currently active draft/compose in the provider
* @param {Object} args The data to set the draft with.
*/
e2ebind.setDraft = function(args) {
  // TODO(yan): Doesn't work when multiple provider compose windows are open
  // on the same page
  e2ebind.sendRequest('set_draft', /** @type {messages.e2ebindDraft} */ ({
    to: args.to || [],
    cc: args.cc || [],
    bcc: args.bcc || [],
    subject: args.subject || '',
    body: args.body || ''
  }));
};


/**
* Validates whather or not we have a private key for this signer.
* @param {string} signer The signer ("name@domain.com") we wish to validate
* @param {!function(boolean)} callback Callback to call with the result.
* @private
*/
e2ebind.validateSigner_ = function(signer, callback) {
  e2ebind.sendExtensionRequest_({
    action: constants.Actions.LIST_ALL_UIDS,
    content: 'private'
  }, function(response) {
    response.content = response.content || [];
    var emails = utils.text.getValidEmailAddressesFromArray(response.content,
                                                            true);
    var valid = goog.array.contains(emails, signer);
    callback(valid);
  });
};


/**
* Validates whether we have a public key for these recipients.
* @param {Array.<string>} recipients The recipients we are checking
* @param {!function(!Array)} callback Callback to call with the result.
* @private
*/
e2ebind.validateRecipients_ = function(recipients, callback) {
  e2ebind.sendExtensionRequest_({
    action: constants.Actions.LIST_ALL_UIDS,
    content: 'public'
  }, function(response) {
    response.content = response.content || [];
    var emails = utils.text.getValidEmailAddressesFromArray(response.content,
                                                            true);
    var results = [];
    goog.array.forEach(recipients, function(recipient) {
      var valid = goog.array.contains(emails, recipient);
      results.push({valid: valid, recipient: recipient});
    });
    callback(results);
  });
};


/**
* Sends a request to the launcher to perform some action.
* @param {Object} args The message we wish to send to the launcher,
*   should heve an 'action' property.
* @param {!function(messages.e2ebindResponse)} callback Callback to call with
*   the result.
* @private
*/
e2ebind.sendExtensionRequest_ = function(args, callback) {
  var port = chrome.runtime.connect();
  port.postMessage(args);

  var respHandler = function(response) {
    if (callback) {
      callback(response);
    }
    port.disconnect();
  };
  port.onMessage.addListener(respHandler);
  port.onDisconnect.addListener(function() {
    port = null;
  });
};

});  // goog.scope
