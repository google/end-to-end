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
 * @param {string=} opt_text Optional text to be decrypted in the glass.
 * @constructor
 * @extends {goog.Disposable}
 */
ui.GlassWrapper = function(targetElem, opt_text) {
  goog.base(this);

  /**
   * The element that will host the looking glass.
   * @type {Element}
   * @private
   */
  this.targetElem_ = targetElem;
  this.targetElem_.setAttribute('original_content', opt_text ? opt_text :
                                this.targetElem_.innerText);

  /**
   * The original text associated with the glass.
   * @type {(string|undefined)}
   * @private
   */
  this.originalText_ = opt_text;

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
 */
ui.GlassWrapper.prototype.installGlass = function() {
  this.targetElem_.lookingGlass = this;
  goog.array.extend(this.targetElemChildren_, this.targetElem_.childNodes);

  var glassFrame = goog.dom.createElement(goog.dom.TagName.IFRAME);
  glassFrame.src = chrome.runtime.getURL('glass.html');
  glassFrame.scrolling = 'no';
  goog.style.setSize(glassFrame, goog.style.getSize(this.targetElem_));
  glassFrame.style.border = 0;

  var pgpMessage = this.originalText_ ? this.originalText_ :
      this.targetElem_.innerText;
  this.targetElem_.textContent = '';
  // TODO(radi): Render in a shadow DOM.
  this.targetElem_.appendChild(glassFrame);

  glassFrame.addEventListener('load', goog.bind(function() {
    glassFrame.contentWindow.postMessage(
        goog.crypt.base64.encodeString(pgpMessage, true),
        chrome.runtime.getURL(''));
  }, this), false);

  glassFrame.addEventListener('mousewheel', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  });
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
