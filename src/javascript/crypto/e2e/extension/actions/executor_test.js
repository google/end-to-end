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
 * @fileoverview Tests for the action executor.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.actions.ExecutorTest');

goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
}


function testExecute() {
  var errorCallback = mockControl.createFunctionMock();
  var callback = mockControl.createFunctionMock();
  var request = {
    action: constants.Actions.USER_SPECIFIED
  };
  var requestor = {};
  var pgpContext = {};
  var action = {
    execute: mockControl.createFunctionMock()
  };
  action.execute(pgpContext, request, requestor, callback, errorCallback);

  var executor = new e2e.ext.actions.Executor(errorCallback);
  stubs.set(executor, 'getAction_', mockControl.createFunctionMock());
  executor.getAction_(constants.Actions.USER_SPECIFIED).$returns(action);

  stubs.setPath('chrome.runtime.getBackgroundPage',
      mockControl.createFunctionMock());
  var ctxCallback = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  chrome.runtime.getBackgroundPage(ctxCallback);

  mockControl.$replayAll();
  executor.execute(request, requestor, callback);
  ctxCallback.arg({
    launcher: {
      getContext: function() {
        return pgpContext;
      }
    }
  });

  mockControl.$verifyAll();
}
