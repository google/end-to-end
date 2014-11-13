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
 * @fileoverview A stub method that allows the invocation of gmonkey API calls
 * inside the Javascript context of Gmail.
 */

(function() {
  var gmonkeyApi;

  /**
   * Handles the bootstrap message coming from the extension.
   */
  var bootstrapMessageHandler = function(e) {
    if (e.origin == window.location.origin && e.data.api == 'e2e-init' &&
        e.ports && e.ports.length == 1) {
      e.ports[0].addEventListener('message', messageHandler, false);
      e.ports[0].start();
      e.ports[0].postMessage({
        api: 'e2e-init',
        result: { 'gmonkey': typeof gmonkey !== 'undefined' }
      });
      window.removeEventListener('message', bootstrapMessageHandler);
    }
  };

  /**
   * Initializes channel messaging with End-To-End extension.
   */
  var initChannel = function() {
    window.addEventListener('message', bootstrapMessageHandler, false);
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

  /**
   * Sends the result back to the extension.
   */
  var sendResult = function(port, request, arg) {
    port.postMessage({
      api: 'gmonkey',
      result: arg,
      requestId: request.id
    });
  };

  /**
   * Sends the error message back to the extension.
   */
  var sendError = function(port, request, errorMessage) {
    port.postMessage({
      api: 'gmonkey',
      error: errorMessage,
      result: null,
      requestId: request.id
    });
  };

  /**
   * Handle incoming End-to-End requests, delaying the response until gmonkey
   * API has loaded.
   * @param  {MessageEvent} event
   */
  var messageHandler = function(event) {
    var request = event.data;
    var port = event.target;
    if (request.call == 'isGmonkeyAvailable') {
      sendResult(port, request, typeof gmonkey !== 'undefined');
      return;
    }
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
      });
    }
  };

  /**
   * Processes request to gmonkey API.
   * @param  {MessagePort} port port to send the response to
   * @param  {{id:string,call:string,args:Object=}} request incoming request
   * @return {[type]}         [description]
   */
  var processApiRequest = function(port, request) {
    var args = request.args;
    switch (request.call) {
      case 'getCurrentMessage':
        var result = null;
        var message = gmonkeyApi.getCurrentMessage();
        if (message) {
          result = {
            'id': message.getContentElement().id,
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

          if (args['body']) {
            draft.setBody(args['body']);
          }
          sendResult(port, request, true);
        });
        break;
      default:
        sendError(port, request, 'Unsupported API call.');
    }
  };
  initChannel();
}).call();
