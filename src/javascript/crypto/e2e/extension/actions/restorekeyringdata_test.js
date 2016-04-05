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
 * @fileoverview Tests for restore key UI
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.actions.RestoreKeyringDataTest');

goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.ext.actions.RestoreKeyringData');
goog.require('e2e.ext.constants');
goog.require('goog.crypt.base64');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.ui.Component');
goog.setTestOnly();

var stubs = new goog.testing.PropertyReplacer();
var constants = e2e.ext.constants;
var ui = null;

function setUp() {
  mockControl = new goog.testing.MockControl();

  stubs.setPath('e2e.openpgp.KeyGenerator.ECC_SEED_SIZE', 5);

  ui = new goog.ui.Component();
  ui.render(document.body);
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();

  ui = null;
}


function testRestoreData() {
  var ctx = {
    restoreKeyring: function(d) {
      assertArrayEquals(d.seed, [1, 2, 3, 4, 5]);
      assertEquals(d.count, 6);
    }
  };

  new e2e.ext.actions.RestoreKeyringData().execute(ctx, {
    action: constants.Actions.RESTORE_KEYRING_DATA,
    content: {
      data: goog.crypt.base64.encodeByteArray(
          [1, 3, 1, 2, 3, 4, 5, 0xa8, 0x4a]),
      email: 'Ryan Chan <rcc@google.com>'
    }
  }, ui, goog.partial(assertEquals, 'Ryan Chan <rcc@google.com>'));
}


function testInvalidVersion() {
  new e2e.ext.actions.RestoreKeyringData().execute({}, {
    action: constants.Actions.RESTORE_KEYRING_DATA,
    content: {
      data: goog.crypt.base64.encodeByteArray(
          [0, 1, 1, 2, 3, 4, 5, 0x50, 0x6f]),
      email: 'Ryan Chan <rcc@google.com>'
    }
  }, ui, function() {
    assert('Invalid version not detected', false);
  }, function(err) {
    assertTrue(err instanceof e2e.error.InvalidArgumentsError);
    assertEquals(err.message, 'Invalid version');
  });
}


function testInvalidRestoreSize() {
  new e2e.ext.actions.RestoreKeyringData().execute({}, {
    action: constants.Actions.RESTORE_KEYRING_DATA,
    content: {
      data: goog.crypt.base64.encodeByteArray(
          [1, 3, 1, 2, 3, 4, 5, 6, 0x1f, 0x46]),
      email: 'Ryan Chan <rcc@google.com>'
    }
  }, ui, function() {
    assert('Invalid restore size not detected', false);
  }, function(err) {
    assertTrue(err instanceof e2e.error.InvalidArgumentsError);
    assertEquals(err.message, 'Backup data has invalid length');
  });
}


function testInvalidChecksum() {
  new e2e.ext.actions.RestoreKeyringData().execute({}, {
    action: constants.Actions.RESTORE_KEYRING_DATA,
    content: {
      data: goog.crypt.base64.encodeByteArray([1, 3, 1, 2, 3, 4, 5, 0, 0]),
      email: 'Ryan Chan <rcc@google.com>'
    }
  }, ui, function() {
    assert('Invalid checksum not detected', false);
  }, function(err) {
    assertTrue(err instanceof e2e.error.InvalidArgumentsError);
    assertEquals(err.message, 'Backup data has invalid checksum');
  });
}
