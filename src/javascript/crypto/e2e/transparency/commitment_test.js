/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the cryptographic commitment scheme in Key
 * Transparency.
 */

goog.require('e2e');
goog.require('e2e.transparency.commitment');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

/**
 * Pre-calculated test vectors for the Key Transparency commitment scheme.  All
 * of these were calculated with a nonce of all zeroes.
 *
 * @see {@link
 * https://github.com/google/keytransparency/blob/master/core/crypto/commitments/commitments_test.go}
 *
 * @const
 */
var TEST_VECTORS = [
  {
    userId: '',
    pubKey: [],  // empty byte array
    commitment: goog.crypt.hexToByteArray(
        '30094c7227737fc4694f83759427044290281e0ed2ddc475726feb491d99a9c9')
  },
  {
    userId: 'foo',
    pubKey: e2e.stringToByteArray('bar'),
    commitment: goog.crypt.hexToByteArray(
        '85425456c59c8af715d352477b2883beea5fc7399d8946d6716285b058b9813c')
  },
  {
    userId: 'foo1',
    pubKey: e2e.stringToByteArray('bar'),
    commitment: goog.crypt.hexToByteArray(
        '9570f81783f11df56c5ed3efc7f03a0fd58c8f404cc0f46b5ec4aefdb94fba45')
  },
  {
    userId: 'foo',
    pubKey: e2e.stringToByteArray('bar1'),
    commitment: goog.crypt.hexToByteArray(
        'cdfc663f9403bc2c6104e5c95cef08403745bf309525ba56147d601041f83d04')
  }
];

/**
 * Fixed all-zero nonce (which was used to generate the test vectors above).
 *
 * @const
 */
var ZERO_NONCE = goog.array.repeat(0x00, 16);


/**
 * Tests commitment verification using the pre-calculated vectors above.
 */
function testKnownCommitments() {
  TEST_VECTORS.forEach(function(testCase) {
    assertTrue(
        `userId = "${testCase.userId}", ` +
            `pubKey = "${e2e.byteArrayToString(testCase.pubKey)}"`,
        e2e.transparency.commitment.matches(
            testCase.userId, ZERO_NONCE, testCase.pubKey, testCase.commitment));
  });
}

/**
 * Tests that commitment verification fails when one bit is changed in the
 * commitment value.
 */
function testCommitmentInvalidWhenMutated() {
  TEST_VECTORS.forEach(function(testCase) {
    var modifiedCommitment = testCase.commitment.slice();
    modifiedCommitment[0] ^= 0x01;
    assertFalse(e2e.transparency.commitment.matches(
        testCase.userId, ZERO_NONCE, testCase.pubKey, modifiedCommitment));
  });
}


/**
 * Tests that a commitment generated for ("foo", "bar") doesn't match
 * ("foob", "ar") or ("fo", "obar").
 */
function testCommitmentResistsSplitting() {
  // We pick one of the test cases that doesn't use any empty strings.
  var commitment = TEST_VECTORS[1].commitment;
  assertFalse(e2e.transparency.commitment.matches(
      'foob', e2e.stringToByteArray('ar'), ZERO_NONCE, commitment));
  assertFalse(e2e.transparency.commitment.matches(
      'fo', e2e.stringToByteArray('obar'), ZERO_NONCE, commitment));
}
