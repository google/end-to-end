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
 * @fileoverview Provides the UI that embeds a website in a <webview> element
 * and provides encryption/decryption capabilities to it.
 */

goog.provide('e2e.ext.ui.WebsiteContainer');

goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.templates.webview');
goog.require('goog.dom');
goog.require('goog.ui.Component');
goog.require('soy');


goog.scope(function() {
var ext = e2e.ext;
var ui = e2e.ext.ui;
var constants = e2e.ext.constants;
var templates = e2e.ext.ui.templates.webview;



/**
 * Embeds a website in a Webview element.
 * @constructor
 * @extends {goog.ui.Component}
 */
ui.WebsiteContainer = function() {
  goog.base(this);
};
goog.inherits(ui.WebsiteContainer, goog.ui.Component);


/** @override */
ui.WebsiteContainer.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
ui.WebsiteContainer.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);
  soy.renderElement(elem, templates.main, {});
  var webview = /** @type {!Webview} */ (
      goog.dom.getElement(constants.ElementId.WEBVIEW));
  webview.addEventListener('loadcommit', function() {
    // Temporary solution to handle race conditions.
    var prompt = goog.dom.getElement(constants.ElementId.PROMPT);
    prompt.contentWindow.location.reload();
  });
  webview.src = 'data:text/html,' +
      '<textarea autofocus style=width:100%;height:500px>test';
};


});  // goog.scope
