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
 * @fileoverview Provides the keyring backup UI.
 */

goog.provide('e2e.ext.ui.dialogs.Overlay');

goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.style');
goog.require('goog.ui.Dialog');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;



/**
 * Constructor of a full screen modal with Ok button and background click close.
 * @constructor
 * @extends {goog.ui.Dialog}
 */
dialogs.Overlay = function() {
  goog.base(this);
  this.setDisposeOnHide(true);
};
goog.inherits(dialogs.Overlay, goog.ui.Dialog);


/** @override */
dialogs.Overlay.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);
  this.setButtonSet(goog.ui.Dialog.ButtonSet.createOk());
  goog.dom.classlist.add(this.getElement(), 'overlayDialog');
  goog.style.setElementShown(
      goog.dom.getElementByClass('modal-dialog-title-close', elem), false);


  /*
  There is a bug in calculating the size of the popup so it is not centered.
  Forcing a reposition fixes the issue.

  Setting a debug breakpoint, reaching it, and hitting continue places the
  window in the correct location.

  Manually checking the window size when stopped at breakpoint results in
  correct result.
  */
  setTimeout(goog.bind(this.reposition, this), 1);
};


/** @override */
dialogs.Overlay.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  this.getHandler().listen(
      this.getBackgroundElement(), goog.events.EventType.CLICK,
      goog.partial(this.setVisible, false));
};

});  // goog.scope
