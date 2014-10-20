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
 * @fileoverview Test data for point arithmetics.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.point.testData');
goog.setTestOnly();


/**
 * G2 is the double of the P-256 base point.
 */
e2e.ecc.point.testData.G2 = [0x04,
  // x
  0x7c, 0xf2, 0x7b, 0x18, 0x8d, 0x03, 0x4f, 0x7e,
  0x8a, 0x52, 0x38, 0x03, 0x04, 0xb5, 0x1a, 0xc3,
  0xc0, 0x89, 0x69, 0xe2, 0x77, 0xf2, 0x1b, 0x35,
  0xa6, 0x0b, 0x48, 0xfc, 0x47, 0x66, 0x99, 0x78,
  // y
  0x07, 0x77, 0x55, 0x10, 0xdb, 0x8e, 0xd0, 0x40,
  0x29, 0x3d, 0x9a, 0xc6, 0x9f, 0x74, 0x30, 0xdb,
  0xba, 0x7d, 0xad, 0xe6, 0x3c, 0xe9, 0x82, 0x29,
  0x9e, 0x04, 0xb7, 0x9d, 0x22, 0x78, 0x73, 0xd1];


/**
 * Test vectors for P-256, downloaded from NIST.
 *     - Q(Qx, Qy) is a public key;
 *     - d is a private key;
 *     - P = dG, where G is the base point;
 *     - Z is the shared secret, which is the X coordinate of dQ.
 */
e2e.ecc.point.testData.P256_VECTORS = [
  {
    'Qx': '700c48f77f56584c5cc632ca65640db91b6bacce3a4df6b42ce7cc838833d287',
    'Qy': 'db71e509e3fd9b060ddb20ba5c51dcc5948d46fbf640dfe0441782cab85fa4ac',
    'd': '7d7dc5f71eb29ddaf80d6214632eeae03d9058af1fb6d22ed80badb62bc1a534',
    'Px': 'ead218590119e8876b29146ff89ca61770c4edbbf97d38ce385ed281d8a6b230',
    'Py': '28af61281fd35e2fa7002523acc85a429cb06ee6648325389f59edfce1405141',
    'Z': '46fc62106420ff012e54a434fbdd2d25ccc5852060561e68040dd7778997bd7b'
  },
  {
    'Qx': '809f04289c64348c01515eb03d5ce7ac1a8cb9498f5caa50197e58d43a86a7ae',
    'Qy': 'b29d84e811197f25eba8f5194092cb6ff440e26d4421011372461f579271cda3',
    'd': '38f65d6dce47676044d58ce5139582d568f64bb16098d179dbab07741dd5caf5',
    'Px': '119f2f047902782ab0c9e27a54aff5eb9b964829ca99c06b02ddba95b0a3f6d0',
    'Py': '8f52b726664cac366fc98ac7a012b2682cbd962e5acb544671d41b9445704d1d',
    'Z': '057d636096cb80b67a8c038c890e887d1adfa4195e9b3ce241c8a778c59cda67'
  },
  {
    'Qx': 'df3989b9fa55495719b3cf46dccd28b5153f7808191dd518eff0c3cff2b705ed',
    'Qy': '422294ff46003429d739a33206c8752552c8ba54a270defc06e221e0feaf6ac4',
    'd': '207c43a79bfee03db6f4b944f53d2fb76cc49ef1c9c4d34d51b6c65c4db6932d',
    'Px': '24277c33f450462dcb3d4801d57b9ced05188f16c28eda873258048cd1607e0d',
    'Py': 'c4789753e2b1f63b32ff014ec42cd6a69fac81dfe6d0d6fd4af372ae27c46f88',
    'Z': '96441259534b80f6aee3d287a6bb17b5094dd4277d9e294f8fe73e48bf2a0024'
  },
  {
    'Qx': '356c5a444c049a52fee0adeb7e5d82ae5aa83030bfff31bbf8ce2096cf161c4b',
    'Qy': '57d128de8b2a57a094d1a001e572173f96e8866ae352bf29cddaf92fc85b2f92',
    'd': '85a268f9d7772f990c36b42b0a331adc92b5941de0b862d5d89a347cbf8faab0',
    'Px': '9cf4b98581ca1779453cc816ff28b4100af56cf1bf2e5bc312d83b6b1b21d333',
    'Py': '7a5504fcac5231a0d12d658218284868229c844a04a3450d6c7381abe080bf3b',
    'Z': '1e51373bd2c6044c129c436e742a55be2a668a85ae08441b6756445df5493857'
  }
];
