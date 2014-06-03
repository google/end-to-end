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
 * @fileoverview Test data for verifying ECDH. These NIST provided test
 * vectors and others can be found at
 *     http://csrc.nist.gov/groups/STM/cavp/documents/components/ecccdhtestvectors.zip
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.ECDH.testData');
goog.setTestOnly('e2e.ecc.ECDH.testData');

goog.require('e2e.ecc.PrimeCurve');


/**
 * Test vectors for P-256, downloaded from NIST.
 *     - Q(Qx, Qy) is a public key;
 *     - d is a private key;
 *     - Z is the shared secret, which is the X coordinate of dQ.
 */
e2e.ecc.ECDH.testData.P256Vectors = [
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': '700c48f77f56584c5cc632ca65640db91b6bacce3a4df6b42ce7cc838833d287',
    'Qy': 'db71e509e3fd9b060ddb20ba5c51dcc5948d46fbf640dfe0441782cab85fa4ac',
    'd': '7d7dc5f71eb29ddaf80d6214632eeae03d9058af1fb6d22ed80badb62bc1a534',
    'Z': '46fc62106420ff012e54a434fbdd2d25ccc5852060561e68040dd7778997bd7b'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': '809f04289c64348c01515eb03d5ce7ac1a8cb9498f5caa50197e58d43a86a7ae',
    'Qy': 'b29d84e811197f25eba8f5194092cb6ff440e26d4421011372461f579271cda3',
    'd': '38f65d6dce47676044d58ce5139582d568f64bb16098d179dbab07741dd5caf5',
    'Z': '057d636096cb80b67a8c038c890e887d1adfa4195e9b3ce241c8a778c59cda67'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': 'df3989b9fa55495719b3cf46dccd28b5153f7808191dd518eff0c3cff2b705ed',
    'Qy': '422294ff46003429d739a33206c8752552c8ba54a270defc06e221e0feaf6ac4',
    'd': '207c43a79bfee03db6f4b944f53d2fb76cc49ef1c9c4d34d51b6c65c4db6932d',
    'Z': '96441259534b80f6aee3d287a6bb17b5094dd4277d9e294f8fe73e48bf2a0024'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': '356c5a444c049a52fee0adeb7e5d82ae5aa83030bfff31bbf8ce2096cf161c4b',
    'Qy': '57d128de8b2a57a094d1a001e572173f96e8866ae352bf29cddaf92fc85b2f92',
    'd': '85a268f9d7772f990c36b42b0a331adc92b5941de0b862d5d89a347cbf8faab0',
    'Z': '1e51373bd2c6044c129c436e742a55be2a668a85ae08441b6756445df5493857'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_384,
    'Qx': 'a7c76b970c3b5fe8b05d2838ae04ab47697b9eaf52e764592efda27fe7513272' +
          '734466b400091adbf2d68c58e0c50066',
    'Qy': 'ac68f19f2e1cb879aed43a9969b91a0839c4c38a49749b661efedf243451915e' +
          'd0905a32b060992b468c64766fc8437a',
    'd': '3cc3122a68f0d95027ad38c067916ba0eb8c38894d22e1b15618b6818a661774a' +
          'd463b205da88cf699ab4d43c9cf98a1',
    'Z': '5f9d29dc5e31a163060356213669c8ce132e22f57c9a04f40ba7fcead493b457e' +
         '5621e766c40a2e3d4d6a04b25e533f1'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_384,
    'Qx': '30f43fcf2b6b00de53f624f1543090681839717d53c7c955d1d69efaf0349b736' +
          '3acb447240101cbb3af6641ce4b88e0',
    'Qy': '25e46c0c54f0162a77efcc27b6ea792002ae2ba82714299c860857a68153ab62e' +
          '525ec0530d81b5aa15897981e858757',
    'd': '92860c21bde06165f8e900c687f8ef0a05d14f290b3f07d8b3a8cc6404366e5d51' +
         '19cd6d03fb12dc58e89f13df9cd783',
    'Z': 'a23742a2c267d7425fda94b93f93bbcc24791ac51cd8fd501a238d40812f4cbfc5' +
         '9aac9520d758cf789c76300c69d2ff'
  }
];
