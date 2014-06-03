// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview A stub method that allows the invocation of gmonkey API calls
 * inside the Javascript context of Gmail.
 */

(function() {
  var scripts = document.querySelectorAll('html>script[call]');
  var lastScript = scripts ? ([].pop.call(scripts)) : null;
  var target = null;
  var args = {};

  if (lastScript) {
    var call = window.JSON.parse(lastScript.getAttribute('call'));
    target = call.target;
    args = call.args || {};
  }

  /**
   * Returns true if a new message is being composed.
   */
  var isComposingNewMessage = function() {
    return window.location.hash.indexOf('?compose=') > -1;
  };

  /**
   * Returns true if there is an open draft.
   */
  var hasDraft = function(api) {
    return api.getMainWindow().getOpenDraftMessages().length > 0;
  };

  /**
   * Returns the last created open draft. If there is no draft, a new draft is
   * created.
   */
  var getDraft = function(api, callback) {
    var draft = api.getMainWindow().getOpenDraftMessages().pop();
    if (draft) {
      callback(draft);
    } else {
      if (!hasDraft(api)) {
        api.getMainWindow().createNewCompose();
      }

      window.setTimeout(getDraft.bind(this, api, callback, false), 50);
    }
  };

  /**
   * Sends the result back to the extension.
   */
  var sendResult = function(arg) {
    var result = arg instanceof Element ? arg.id : arg;

    window.postMessage(window.JSON.stringify({
      api: 'gmonkey',
      result: result,
      call: target
    }), window.location.origin);
  };

  gmonkey.load('2', function(api) {
    switch (target) {
      case 'getCurrentMessage':
        var result = null;
        var message = api.getCurrentMessage();
        if (message) {
          result = message.getContentElement();
        }
        sendResult(result);
        break;
      case 'getActiveDraft':
        getDraft(api, function(draft) {
          var result = {
            'to': draft.getTo(),
            'cc': draft.getCc(),
            'body': draft.getBody()
          };

          if (isComposingNewMessage()) {
            result['body'] = draft.getBody();
          } else {
            var contentElem = api.getMainWindow()
                .getActiveMessage()
                .getContentElement();
            result['body'] = contentElem.innerText ||
                contentElem.getAttribute('original_content') || '';
          }

          sendResult(result);
        });

        break;
      case 'hasActiveDraft':
        sendResult(hasDraft(api));
        break;
      case 'setActiveDraft':
        getDraft(api, function(draft) {
          if (args['to']) {
            draft.setTo(args['to']);
          }

          if (args['body']) {
            draft.setBody(args['body']);
          }

          sendResult(null);
        });
        break;
    }
  });

  if (lastScript && lastScript.parentElement) {
    lastScript.parentElement.removeChild(lastScript);
  }
}).call();

