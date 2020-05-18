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
 * @fileoverview Retrieves key description for a given block of keys.
 */

goog.provide('e2e.ext.actions.GetKeyDescription');

goog.require('e2e.ext.actions.Action');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.dialogs.ImportConfirmation');
goog.require('e2e.ext.utils.Error');
goog.require('goog.dom');

goog.scope(function() {
var actions = e2e.ext.actions;
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var utils = e2e.ext.utils;



/**
 * Constructor for the action.
 * @constructor
 * @implements {e2e.ext.actions.Action.<string, (string|undefined)>}
 */
actions.GetKeyDescription = function() {};


/** @inheritDoc */
actions.GetKeyDescription.prototype.execute =
    function(ctx, request, requestor, callback, errorCallback) {
  var dialogContainer = goog.dom.getElement(
      constants.ElementId.CALLBACK_DIALOG);

  if (!dialogContainer || !requestor) {
    errorCallback(new utils.Error(
        'Unable to render UI dialogs.', 'errorUnableToRenderDialog'));
    return;
  }

  ctx.getKeyDescription(request.content).
      addCallback(function(keyDescription) {
        var dialog = new dialogs.ImportConfirmation(
            keyDescription, function(result) {
              goog.dispose(dialog);
              callback(result);
            });
        requestor.addChild(dialog, false);
        dialog.render(dialogContainer);
      }).
      addErrback(errorCallback);
};

});  // goog.scope
