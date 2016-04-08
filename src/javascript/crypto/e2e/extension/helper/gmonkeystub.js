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
 * @fileoverview A stub method that allows the invocation of End-To-End Website
 * API calls inside the Javascript context of Gmail using gmonkey API provided
 * by Gmail.
 */

(function() {
  var gmonkeyApi;
  // TODO(koto): Remove closure, add unit tests and make that a compiled script.

  var lastDraftMessagesCount = null;

  var requestId = 1; // Initial ID for web application-initiated requests.

  /**
   * Handles the bootstrap message coming from the extension.
   * @param {MessageEvent} e bootstrap message sent from the extension.
   */
  var bootstrapMessageHandler = function(e) {
    if (e.origin == window.location.origin &&
        e.data.api == 'e2e-init' &&
        e.ports &&
        e.ports.length == 1) {
      e.ports[0].addEventListener('message', messageHandler, false);
      e.ports[0].start();
      e.ports[0].postMessage({
        api: 'e2e-init',
        version: 1,
        available: isApiAvailable()
      });
      window.removeEventListener('message', bootstrapMessageHandler);
    }
  };


  /**
   * Initializes channel messaging with E2E.
   */
  var initChannel = function() {
    window.addEventListener('message', bootstrapMessageHandler, false);
  };


  /**
   * Sends the result back to E2E.
   * @param {MessagePort} port Port to send the response through.
   * @param {Object} request The request object we're sending the response to.
   * @param {Object} result Result of the request.
   */
  var sendResult = function(port, request, result) {
    port.postMessage({
      result: result,
      requestId: request.id
    });
  };


  /**
   * Sends the error message back to E2E.
   * @param {MessagePort} port Port to send the response through.
   * @param {Object} request The request object we're sending the response to.
   * @param {string} errorMessage The error message.
   */
  var sendError = function(port, request, errorMessage) {
    port.postMessage({
      error: errorMessage,
      result: null,
      requestId: request.id
    });
  };

  // GMonkey-specific API implementation below.

  /**
   * Indicates if we should report API availability to E2E.
   * @return {boolean} True if the API object is available.
   */
  var isApiAvailable = function() {
    return typeof gmonkey !== 'undefined';
  };


  /**
   * Handles incoming E2E requests, delaying the response until gmonkey API has
   * loaded.
   * @param  {MessageEvent} event Event to handle.
   */
  var messageHandler = function(event) {
    var request = event.data;
    var port = event.target;
    if (gmonkeyApi) { // API is already loaded
      processApiRequest(port, request);
    } else {
      if (!gmonkey || !gmonkey.load) {
        sendError(port, request, 'gmonkey is not available.');
        return;
      }
      gmonkey.load('2', function(api) {
        // Load the API
        gmonkeyApi = api;
        processApiRequest(port, request);
        // The following function probes for newly-opened draft messages
        // and sends an 'openCompose' Website API request when a new draft
        // has been found. It's to workaround a yet-missing gmonkey
        // functionality.
        var draftMessagesHunter = function() {
          var newCount = gmonkeyApi.getMainWindow().getOpenDraftMessages()
              .length;
          if (lastDraftMessagesCount !== null &&
              newCount > lastDraftMessagesCount) {
            setTimeout(function() {
              // NOTE: Timeout to workaround a Gmail issue. Plaintext body is
              // HTML for some time.
              getDraft(function(draft) {
                port.postMessage({
                  id: String(requestId++),
                  call: 'openCompose',
                  args: {
                    'to': draft.getToEmails(),
                    'cc': draft.getCcEmails(),
                    'body': draft.getPlainTextBody()
                  }
                });
              });
            }, 100); // Chosen experimentally.
          }
          lastDraftMessagesCount = newCount;
        };
        setInterval(draftMessagesHunter, 50);
      });
    }
  };


  /**
   * Processes request to E2E Website API.
   * @param  {MessagePort} port port to send the response to
   * @param  {{id:string,call:string,args}} request incoming request
   */
  var processApiRequest = function(port, request) {
    var args = request.args;
    switch (request.call) {
      case 'ready':
        break; // Ignore. Gmonkey does not initiate requests.
      case 'getCurrentMessage':
        var result = null;
        var message = gmonkeyApi.getCurrentMessage();
        if (message) {
          var escapedId = message.getContentElement().id
              .replace(/(\\|")/g, '\\$1');
          result = {
            'selector': '[id="' + escapedId + '"]',
            'body': message.getPlainTextContent()
          };
        }
        sendResult(port, request, result);
        break;
      case 'getActiveDraft':
        getDraft(function(draft) {
          var result = {
            'to': draft.getToEmails(),
            'cc': draft.getCcEmails(),
            'body': draft.getPlainTextBody()
          };
          if (gmonkeyApi.SUBJECTS_ENABLED_FOR_TESTS_ONLY) {
            result.subject = draft.getSubject();
          }
          sendResult(port, request, result);
        });
        break;
      case 'hasActiveDraft':
        sendResult(port, request, hasDraft());
        break;
      case 'setActiveDraft':
        getDraft(function(draft) {
          if (args['to']) {
            draft.setToEmails(args['to']);
          }

          if ('body' in args) {
            draft.setBody(args['body']);
          }

          if (gmonkeyApi.SUBJECTS_ENABLED_FOR_TESTS_ONLY &&
              ('subject' in args)) {
            draft.setSubject(args['subject']);
          }

          if (args['send']) {
            draft.send();
          }

          sendResult(port, request, true);
        });
        break;
      default:
        sendError(port, request, 'Unsupported API call.');
    }
  };


  /**
   * Returns true if there is an open draft.
   */
  var hasDraft = function() {
    return gmonkeyApi.getMainWindow().getOpenDraftMessages().length > 0;
  };


  /**
   * Returns the last created open draft. If there is no draft, a new draft is
   * created.
   */
  var getDraft = function(callback) {
    var draft = gmonkeyApi.getMainWindow().getOpenDraftMessages()[0];
    if (draft) {
      callback(draft);
    } else {
      if (!hasDraft()) {
        gmonkeyApi.getMainWindow().createNewCompose();
      }
      window.setTimeout(getDraft.bind(this, callback, false), 50);
    }
  };

  initChannel();
}).call();
