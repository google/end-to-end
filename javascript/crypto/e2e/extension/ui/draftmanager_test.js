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
 * @fileoverview Description of this file.
 */

goog.require('e2e.ext.ui.draftmanager');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

var drafts = e2e.ext.ui.draftmanager;


function setUp() {
  window.localStorage.clear();
}


function testWriteRead() {
  drafts.saveDraft('test draft', 'http://www.example.com');
  assertEquals('test draft', drafts.getDraft('http://www.example.com'));
}


function testInvalidOrigin() {
  drafts.saveDraft('test draft', 'http://www.example.com');
  assertEquals('', drafts.getDraft('http://foo.example.com'));
}


function testClearDraft() {
  var draft = 'test draft';
  var origin = 'http://www.example.com';
  drafts.saveDraft(draft, origin);
  assertTrue(drafts.hasDraft(origin));
  assertEquals(draft, drafts.getDraft(origin));
  drafts.clearDraft(origin);
  assertFalse(drafts.hasDraft(origin));
  assertEquals('', drafts.getDraft(origin));
}
