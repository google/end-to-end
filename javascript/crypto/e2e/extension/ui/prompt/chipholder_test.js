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
 * @fileoverview Tests for the UI chip holder.
 */

goog.require('e2e.ext.ChipHolder');
goog.require('e2e.ext.constants');
goog.require('goog.dom.classes');
goog.require('goog.events.KeyCodes');
goog.require('goog.style');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

var chipHolder = null;
var constants = e2e.ext.constants;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  stubs.setPath('chrome.i18n.getMessage', function(msg) {
    return msg;
  });

  chipHolder = new e2e.ext.ChipHolder(['1'], ['1', '2', '3']);
  chipHolder.decorate(document.body);
}


function tearDown() {
  stubs.reset();
  chipHolder = null;
}


function testRender() {
  assertEquals('promptRecipientsPlaceholder1', document.body.textContent);
}


function testAddChip() {
  chipHolder.addChip('2');
  chipHolder.addChip(new e2e.ext.Chip('5', true));
  assertEquals('1,2', chipHolder.getSelectedUids().join(','));
  assertEquals('5', chipHolder.getProvidedPassphrases().join(','));
}


function testIncreaseInputArea() {
  var originalWidth = goog.style.getSize(chipHolder.shadowInputElem_).width;
  chipHolder.handleKeyEvent_({keyCode: 'a'.charCodeAt(0)});

  assertTrue(originalWidth < goog.style.getSize(
      chipHolder.shadowInputElem_).width);
}


function testRemoveChipOnBackspace() {
  chipHolder.addChip('2');
  chipHolder.handleKeyEvent_({keyCode: goog.events.KeyCodes.BACKSPACE});
  assertEquals('1', chipHolder.getSelectedUids().join(','));

  chipHolder.handleKeyEvent_({keyCode: goog.events.KeyCodes.BACKSPACE});
  assertEquals('', chipHolder.getSelectedUids().join(','));
}


function testAddChipOnTab() {
  chipHolder.shadowInputElem_.value = '2';
  chipHolder.autoComplete_ = {
    getSuggestion: function() {
      return '2';
    }
  };
  var trappedEvent = false;
  var trappedDefaultAction = false;
  chipHolder.handleKeyEvent_({
    keyCode: goog.events.KeyCodes.TAB,
    preventDefault: function() {
      trappedDefaultAction = true;
    },
    stopPropagation: function() {
      trappedEvent = true;
    }
  });
  assertEquals('1,2', chipHolder.getSelectedUids().join(','));
  assertTrue(trappedDefaultAction);
  assertTrue(trappedEvent);
}


function testMarkChipBad() {
  chipHolder.shadowInputElem_.value = '2';
  chipHolder.autoComplete_ = {
    getSuggestion: function() {
      return '';
    }
  };
  var trappedEvent = false;
  var trappedDefaultAction = false;
  chipHolder.handleKeyEvent_({
    keyCode: goog.events.KeyCodes.TAB,
    preventDefault: function() {
      trappedDefaultAction = true;
    },
    stopPropagation: function() {
      trappedEvent = true;
    }
  });
  assertEquals('1,2', chipHolder.getSelectedUids().join(','));
  assertTrue(goog.dom.classes.has
      (chipHolder.getChildAt(1).getElement(), constants.CssClass.BAD_CHIP));
}


function testEmptyInputDoesNotMarkLastChipBad() {
  chipHolder.shadowInputElem_.value = '';
  chipHolder.autoComplete_ = {
    getSuggestion: function() {
      return '';
    }
  };
  var trappedEvent = false;
  var trappedDefaultAction = false;
  chipHolder.handleKeyEvent_({
    keyCode: goog.events.KeyCodes.TAB,
    preventDefault: function() {
      trappedDefaultAction = true;
    },
    stopPropagation: function() {
      trappedEvent = true;
    }
  });
  assertEquals('1', chipHolder.getSelectedUids().join(','));
  assertFalse(goog.dom.classes.has
      (chipHolder.getChildAt(0).getElement(), constants.CssClass.BAD_CHIP));
}

function testPendingInputMarkChipBad() {
  chipHolder.shadowInputElem_.value = 'bad';
  chipHolder.autoComplete_ = {
    getSuggestion: function() {
      return '';
    }
  };
  var trappedEvent = false;
  var trappedDefaultAction = false;
  chipHolder.handleKeyEvent_({
    keyCode: goog.events.KeyCodes.TAB,
    preventDefault: function() {
      trappedDefaultAction = true;
    },
    stopPropagation: function() {
      trappedEvent = true;
    }
  });
  assertEquals('1,bad', chipHolder.getSelectedUids().join(','));
  assert(goog.dom.classes.has
      (chipHolder.getChildAt(1).getElement(), constants.CssClass.BAD_CHIP));
}

function testLock() {
  chipHolder.lock();
  assertTrue(chipHolder.isLocked());
  assertTrue(chipHolder.getChildAt(0).isLocked());
  chipHolder.handleKeyEvent_({keyCode: goog.events.KeyCodes.BACKSPACE});
  assertEquals('1', chipHolder.getSelectedUids().join(','));
  chipHolder.addChip('2');
  assertEquals('1', chipHolder.getSelectedUids().join(','));
  chipHolder.getChildAt(0).remove();
  assertEquals('1', chipHolder.getSelectedUids().join(','));
}
