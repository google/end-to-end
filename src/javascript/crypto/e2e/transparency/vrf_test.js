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
 * @fileoverview Tests for VRF verification in Key Transparency.
 */

goog.require('e2e');
goog.require('e2e.ecc.DomainParam');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.transparency.vrf');
goog.require('goog.crypt');
goog.require('goog.string');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


// Copied from test key at
// https://github.com/google/keytransparency/blob/master/core/crypto/vrf/p256/p256_test.go#L33
// and then turned into raw bytes with:
//   openssl ec -in p256-key.pem -noout -text
var PUBLIC_KEY_BYTES = [
  0x04, 0x53, 0x15, 0xf8, 0xda, 0x8c, 0x49, 0xe6, 0xfa, 0x22, 0x35, 0xf6, 0xe3,
  0xa3, 0x3f, 0x14, 0x82, 0xc1, 0xaa, 0x87, 0x56, 0xc3, 0xd4, 0xd5, 0xca, 0xf6,
  0x6f, 0x15, 0x8a, 0xf3, 0xe6, 0x41, 0x2a, 0x18, 0x51, 0xd5, 0x45, 0x80, 0xd6,
  0xaf, 0x72, 0xc1, 0x5a, 0x42, 0x1a, 0x21, 0x92, 0x20, 0x84, 0xb6, 0x16, 0x39,
  0xd4, 0x66, 0xba, 0x5d, 0xaf, 0xa0, 0x82, 0x7f, 0x9e, 0x4d, 0x9b, 0x5f, 0xf5
];

var PUBLIC_KEY = e2e.ecc.DomainParam.fromCurve(e2e.ecc.PrimeCurve.P_256)
                     .curve.pointFromByteArray(PUBLIC_KEY_BYTES);

// Copied from https://github.com/google/keytransparency/pull/780.
var TEST_VECTORS = [
  {
    message: 'data1',
    proof: goog.crypt.hexToByteArray(
        'ceaccb3cfc61954004948f131de6cd689555b3834480221ab9ef103a40a63f7a9b47fe8155512531bc0acf9b2314837c2fc43d24b4b9d98f13aff09b2a7ae8810423835a97b337a06769a47e05e4c0b68bcd499d35e7cf7606283d74e41d59a4bbc5f4af2da3b83b7c7ab76598aecbf495714815eae51016410e961f6153a6c5ea')
  },
  {
    message: 'data2',
    proof: goog.crypt.hexToByteArray(
        '0c39c84e152596e81df4281c5459957b893a7fde2492e0358cc1c8ab891c9a00c74f36c349306e039a3c0f1fcc9e9523ee8d8f29398b68e6c02ddb70b3406f9e0447d0f7c330343720da2ae0959cfd2c3bda9083af475203efb07bcb2e18d12b99abf1a10001d355ae3f9a34c53052a70ff3af03024ad3ada1d188949a707376e6')
  },
  {
    message: 'data2',
    proof: goog.crypt.hexToByteArray(
        'a907df20dcd190c10ab217db1c752ccf12817a221e43e99e6187e3d3848b803b991b7e474c120af45a46698724136a5691c189afdf73ab00033eb491849b44600447d0f7c330343720da2ae0959cfd2c3bda9083af475203efb07bcb2e18d12b99abf1a10001d355ae3f9a34c53052a70ff3af03024ad3ada1d188949a707376e6')
  }
];

/**
 * Returns a VRF verifier from PUBLIC_KEY_BYTES.
 *
 * @return {!e2e.transparency.vrf.Verifier}
 */
function makeVerifier() {
  var curve = e2e.ecc.DomainParam.fromCurve(e2e.ecc.PrimeCurve.P_256).curve;
  var publicKey = curve.pointFromByteArray(PUBLIC_KEY_BYTES);
  return new e2e.transparency.vrf.Verifier(publicKey);
}


function testHashToCurvePoint() {
  for (var i = 0; i < 1000; i++) {
    var result1, result2;
    var input = goog.string.getRandomString();
    assertNotThrows(function() {
      result1 =
          e2e.transparency.vrf.hashToCurvePoint(e2e.stringToByteArray(input));
      result2 =
          e2e.transparency.vrf.hashToCurvePoint(e2e.stringToByteArray(input));
    });
    assertTrue(result1.isOnCurve());
    assertTrue(result1.isEqual(result2));
  }
}


function testHashToBigNum() {
  var MAX_BYTE_LEN = 32;
  for (var i = 0; i < 1000; i++) {
    var result1, result2;
    var input = goog.string.getRandomString();
    assertNotThrows(function() {
      result1 = e2e.transparency.vrf.hashToBigNum(e2e.stringToByteArray(input));
      result2 = e2e.transparency.vrf.hashToBigNum(e2e.stringToByteArray(input));
    });
    assertTrue(result1.getBitLength() >= 8 * 1);
    assertTrue(result1.getBitLength() <= 8 * MAX_BYTE_LEN);
    assertTrue(result1.isEqual(result2));
  }
}

function testKnownProofs() {
  TEST_VECTORS.forEach(function(testCase) {
    assertTrue(e2e.transparency.vrf.verify(
        e2e.stringToByteArray(testCase.message), testCase.proof, PUBLIC_KEY));
  });
}

function testProofInvalidWhenMutated() {
  TEST_VECTORS.forEach(function(testCase) {
    var modifiedProof = testCase.proof.slice();
    modifiedProof[0] ^= 0x01;
    assertFalse(e2e.transparency.vrf.verify(
        e2e.stringToByteArray(testCase.message), modifiedProof, PUBLIC_KEY));
  });
}
