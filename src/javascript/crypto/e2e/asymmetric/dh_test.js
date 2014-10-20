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
 * @fileoverview Defines tests for the DATA type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */


goog.require('e2e.cipher.DiffieHellman');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var hexToByteArray = goog.crypt.hexToByteArray;
var stubs = null;

function setUp() {
  stubs = new goog.testing.PropertyReplacer();
}

function tearDown() {
  stubs.reset();
}

function testGenerate() {
  // NIST KAS Validation test vectors.
  var p = hexToByteArray(
      'da3a8085d372437805de95b88b675122f575df976610c6a844de9' +
      '9f1df82a06848bf7a42f18895c97402e81118e01a00d0855d51922f434c022350861d' +
      '58ddf60d65bc6941fc6064b147071a4c30426d82fc90d888f94990267c64beef8c304' +
      'a4b2b26fb93724d6a9472fa16bc50c5b9b8b59afb62cfe9ea3ba042c73a6ade35');
  var g = hexToByteArray(
      'a51883e9ac0539859df3d25c716437008bb4bd8ec4786eb4bc643' +
      '299daef5e3e5af5863a6ac40a597b83a27583f6a658d408825105b16d31b6ed088fc6' +
      '23f648fd6d95e9cefcb0745763cddf564c87bcf4ba7928e74fd6a3080481f588d535e' +
      '4c026b58a21e1e5ec412ff241b436043e29173f1dc6cb943c09742de989547288');
  var xa = hexToByteArray('42c6ee70beb7465928a1efe692d2281b8f7b53d6');
  var xb = hexToByteArray('54081a8fef2127a1f22ed90440b1b09c331d0614');
  var ya = hexToByteArray(
      '5a7890f6d20ee9c7162cd84222cb0c7cb5b4f29244a58fc95327' +
      'fc41045f476fb3da42fca76a1dd59222a7a7c3872d5af7d8dc254e003eccdb38f2916' +
      '19c51911df2b6ed67d0b459f4bc25819c0078777b9a1a24c72e7c037a3720a1edad58' +
      '63ef5ac75ce816869c820859558d5721089ddbe331f55bef741396a3bbf85c6c1a');
  var yb = hexToByteArray(
      '0b92af0468b841ea5de4ca91d895b5e922245421de57ed7a88d2' +
      'de41610b208e8e233705f17b2e9eb91914bad2fa87f0a58519a7da2980bc06e7411c9' +
      '25a6050526bd86e621505e6f610b63fdcd9afcfaa96bd087afca44d9197cc35b559f7' +
      '31357a5b979250c0f3a254bb8165f5072156e3fd6f9a6e69bcf4b4578f78b3bde7');
  var zz = hexToByteArray(
      '8d8f4175e16e15a42eb9099b11528af88741cc206a088971d3064bb2' +
      '91eda608d1600bff829624db258fd15e95d96d3e74c6be3232afe5c855b9c59681ce1' +
      '3b7aea9ff2b16707e4c02f0e82bf6dadf2149ac62630f6c62dea0e505e3279404da5f' +
      'fd5a088e8474ae0c8726b8189cb3d2f04baffe700be849df9f91567fc2ebb8');
  var generate = function(g, x) {
    stubs.setPath('e2e.random.getRandomBytes', function(n) {
      return x;
    });
    var dh = new e2e.cipher.DiffieHellman(p, g);
    return dh.generate(g);
  };
  assertArrayEquals(yb, generate(g, xb));
  assertArrayEquals(ya, generate(g, xa));
  assertArrayEquals(zz, generate(yb, xa));
  assertArrayEquals(zz, generate(ya, xb));
}

function testGenerateExponent() {
  var dh = new e2e.cipher.DiffieHellman([23], [5]);
  var count = 0;
  stubs.setPath('e2e.random.getRandomBytes', function(n) {
    if (++count == 4) stubs.reset();
    return goog.array.repeat(0, n);
  });
  assertNotEquals([0], dh.generateExponent_());
  assertEquals(4, count);
}
