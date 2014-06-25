// Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the common utility methods.
 */

goog.require('e2e.ext.utils');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

var testCase = goog.testing.AsyncTestCase.createAndInstall();
var utils = e2e.ext.utils;


function testWrite() {
  var filename = 'temp1.txt';
  var content = 'some content';
  var createdFile = false;

  utils.writeToFile(content, function(fileUrl) {
    createdFile = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileUrl, false);
    xhr.send();
    assertEquals('Failed to store contents', content, xhr.responseText);
  });

  testCase.waitForAsync('waiting for file to be created');
  window.setTimeout(function() {
    assertTrue('Failed to create file', createdFile);
    testCase.continueTesting();
  }, 500);
}


function testRead() {
  var content = 'some content';
  var readFile = false;
  var file = new Blob([content], {type: 'text/plain'});
  testCase.waitForAsync('waiting for file to be read');
  utils.readFile(file, function(readContents) {
    readFile = true;
    assertEquals('Failed to read contents', content, readContents);
    testCase.continueTesting();
  });
}
