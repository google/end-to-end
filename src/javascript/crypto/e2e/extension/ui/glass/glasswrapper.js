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
 * @fileoverview Wrapper for the looking glass. Adds install and remove methods.
 */

goog.provide('e2e.ext.ui.GlassWrapper');

goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.crypt.base64');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.style');

goog.scope(function() {
var ui = e2e.ext.ui;



/**
 * Constructor for the looking glass wrapper.
 * @param {Element} targetElem The element that will host the looking glass.
 * @constructor
 * @extends {goog.Disposable}
 */
ui.GlassWrapper = function(targetElem) {
  goog.base(this);

  /**
   * The element that will host the looking glass.
   * @type {Element}
   * @private
   */
  this.targetElem_ = targetElem;
  this.targetElem_.setAttribute('original_content', this.targetElem_.innerText);

  /**
   * The original children of the target element.
   * @type {!Array.<Node>}
   * @private
   */
  this.targetElemChildren_ = [];
};
goog.inherits(ui.GlassWrapper, goog.Disposable);


/** @override */
ui.GlassWrapper.prototype.disposeInternal = function() {
  this.removeGlass();

  goog.base(this, 'disposeInternal');
};


/**
 * Installs the looking glass into the hosting page.
 * @param {function()=} opt_callback Callback function to call when the glass
 *     frame was loaded.
 */
ui.GlassWrapper.prototype.installGlass = function(opt_callback) {
  this.targetElem_.lookingGlass = this;
  goog.array.extend(this.targetElemChildren_, this.targetElem_.childNodes);

  var glassFrame = goog.dom.createElement(goog.dom.TagName.IFRAME);
  glassFrame.scrolling = 'no';
  goog.style.setSize(glassFrame, goog.style.getSize(this.targetElem_));
  glassFrame.style.border = 0;

  var pgpMessage = e2e.openpgp.asciiArmor.extractPgpBlock(
      this.targetElem_.innerText);
  var surroundings = this.targetElem_.innerText.split(pgpMessage);
  this.targetElem_.textContent = '';
  this.targetElem_.appendChild(document.createTextNode(surroundings[0]));
  this.targetElem_.appendChild(document.createElement('p'));
  // TODO(radi): Render in a shadow DOM.
  this.targetElem_.appendChild(glassFrame);
  this.targetElem_.appendChild(document.createElement('p'));
  this.targetElem_.appendChild(document.createTextNode(surroundings[1]));

  glassFrame.addEventListener('load', goog.bind(function() {
    glassFrame.contentWindow.postMessage(
        goog.crypt.base64.encodeString(pgpMessage, true),
        chrome.runtime.getURL(''));
    if (opt_callback) {
      opt_callback();
    }
  }, this), false);

  glassFrame.addEventListener('mousewheel', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  });
  // Loading the document after an onload handler has been bound.
  glassFrame.src = chrome.runtime.getURL('glass.html');
};


/**
 * Removes the looking glass from the hosting page.
 */
ui.GlassWrapper.prototype.removeGlass = function() {
  this.targetElem_.lookingGlass = undefined;
  this.targetElem_.textContent = '';
  goog.array.forEach(this.targetElemChildren_, function(child) {
    this.targetElem_.appendChild(child);
  }, this);

  this.targetElemChildren_ = [];
};


/**
 * Returns the original content of the target element where the looking glass is
 * installed.
 * @return {string} The original content.
 */
ui.GlassWrapper.prototype.getOriginalContent = function() {
  return this.targetElem_.getAttribute('original_content');
};

});  // goog.scope
