/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the WebsiteContainer.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.WebsiteContainerTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.Prompt');
goog.require('e2e.ext.ui.WebsiteContainer');
goog.require('e2e.ext.utils.action');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var page = null;
var stubs = new goog.testing.PropertyReplacer();
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);
  page = new e2e.ext.ui.WebsiteContainer('about:blank');
}

function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  goog.dispose(page);
}

function testRendering() {
  stubs.replace(chrome.i18n, 'getMessage', function(a) {
    return a;
  });

  page.decorate(document.documentElement);
  assertNotNull(document.getElementById('show-prompt'));
}

function testPrompt() {
  page.decorate(document.documentElement);
  document.getElementById('show-prompt').click();
  assertEquals(1, page.getChildCount());
  assertTrue(page.getChildAt(0) instanceof e2e.ext.ui.Prompt);
  assertTrue(page.interactionSuppressed_);
  document.getElementById('show-prompt').click();
  assertEquals(0, page.getChildCount());
  assertNull(page.prompt_);
  assertTrue(page.interactionSuppressed_);
}

function testOptions() {
  var launcher = {
    createWindow: function(url, isForeground) {
      assertEquals('settings.html', url);
      assertTrue(isForeground);
      asyncTestCase.continueTesting();
    }
  };
  stubs.replace(e2e.ext.utils.action, 'getLauncher', function(cb) {
    cb(launcher);
  });
  page.decorate(document.documentElement);
  asyncTestCase.waitForAsync('Waiting for launcher');
  document.getElementById('options').click();
}

function testKeyboardSuppression() {
  stubs.replace(chrome.i18n, 'getMessage', function(a) {
    return a;
  });
  page.decorate(document.documentElement);
  page.enterInteractionSuppressedMode_();
  var counter = 0;
  var increaseCounter = function() {
    counter++;
  };
  var keypress = {
    type: 'keypress',
    keyCode: 0x65,
    preventDefault: increaseCounter,
    stopPropagation: increaseCounter,
    stopImmediatePropagation: increaseCounter
  };
  page.focusStealerListener_(keypress);
  assertContains('interactionSuppressed', document.body.textContent);
  assertEquals(3, counter);
}


function testKeyboardEnter() {
  stubs.replace(chrome.i18n, 'getMessage', function(a) {
    return a;
  });
  page.decorate(document.documentElement);
  page.enterInteractionSuppressedMode_();
  var keypress = {
    type: 'keypress',
    keyCode: 13,
    preventDefault: fail,
    stopPropagation: fail,
    stopImmediatePropagation: fail
  };
  page.focusStealerListener_(keypress);
  assertNotContains('interactionSuppressed', document.body.textContent);
}


function testWebsiteRequest() {
  var request = {
    request: true,
    action: undefined,
    selection: 'test body'
  };
  stubs.replace(chrome.i18n, 'getMessage', function(a) {
    return a;
  });
  page.decorate(document.documentElement);
  asyncTestCase.waitForAsync('Waiting for the prompt');
  page.handleWebsiteRequest_(request);
  asyncTestCase.timeout(function() {
    assertTrue(page.getChildAt(0) instanceof e2e.ext.ui.Prompt);
    assertTrue(page.interactionSuppressed_);
    assertObjectEquals(request, page.prompt_.injectedContent_);
    asyncTestCase.continueTesting();
  }, 100);

}
