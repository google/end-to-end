/**
 * @license
 * Copyright 2011 Google Inc. All rights reserved.
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
 * @fileoverview Performance testing for BigNum and BigNumModulus.
 *
 * @author fy@google.com (Frank Yellin)
 * @author koto@google.com (Krzysztof Kotowicz)
 */

goog.provide('e2e.BigNumTester');

goog.require('e2e.BigNum');
goog.require('e2e.BigNumModulus');
goog.require('e2e.bigNumTestData');
goog.require('e2e.ecc.DomainParam');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.testing.Util');
goog.setTestOnly();


/**
 * Runs performance tests for BigNum operations (P256).
 * @return {!Object.<string,Object>} Performance stats (object is filled only
 *     when tests are run outside browser).
 */
e2e.BigNumTester.runP256Benchmark = function() {
  var P256 = new e2e.BigNum(e2e.bigNumTestData.P_256);
  var A = new e2e.BigNum(e2e.bigNumTestData.A);
  var B = new e2e.BigNum(e2e.bigNumTestData.B);

  var P512 = P256.multiply(P256);
  var params = e2e.ecc.DomainParam.fromCurve(
      e2e.ecc.PrimeCurve.P_256);

  var TIMES = 10000;
  var tests = [];
  e2e.testing.Util.addBenchmark(tests,
      function() {
        for (var i = 0; i < TIMES; ++i)
          params.n.residue(P512);
      },
      'FastModulusFFFFFF.residue');
  e2e.testing.Util.addBenchmark(tests,
      function() {
        for (var i = 0; i < TIMES; ++i)
          P512.mod(params.n);
      },
      'BigNum.mod params.n');
  e2e.testing.Util.addBenchmark(tests,
      function() {
        for (var i = 0; i < TIMES; ++i)
          params.curve.q.residue(P512);
      },
      'FastModulus.NIST.P_256.residue');
  e2e.testing.Util.addBenchmark(tests,
      function() {
        for (var i = 0; i < TIMES; ++i)
          P512.mod(params.curve.q);
      },
      'BigNum.mod params.curve.q');
  e2e.testing.Util.addBenchmark(tests,
      function() {
        for (var i = 0; i < TIMES; ++i)
          params.curve.q.modMultiply(A, B);
      },
      'modMultiply with residue');
  e2e.testing.Util.addBenchmark(tests,
      function() {
        for (var i = 0; i < TIMES; ++i)
          params.curve.q.modMul_(A, B);
      },
      'modMultiply with Montgomery');

  return e2e.testing.Util.runPerfTests(tests, 10, 10000);
};


/**
 * Runs benchmark based on calculations done during RSA encryption/decryption.
 * @return {!Object.<string,Object>} Performance stats (object is filled only
 *     when tests are run outside browser).
 */
e2e.BigNumTester.runRsaBenchmark = function() {
  var tests = [];
  var R = e2e.BigNum.fromInternalArray([9552989, 1615003, 14809368, 4904522,
    7355076, 4187269, 1863597, 12742352, 11743680, 8995794, 3390769, 386177,
    6204949, 4941333, 2320445, 10095948, 10877138, 15687067, 3915499,
    11722178, 8689194, 6489401, 3545525, 11005113, 14506245, 2747106, 2327502,
    13294668, 796929, 12338512, 16422056, 13415665, 20936, 7503485, 10120731,
    4398963, 11027881, 8867546, 9604175, 16130473, 10495524, 5458067, 4373902,
    12435907, 2000823, 12395738, 14597390, 14618885, 3388439, 13809253,
    622223, 9776305, 1459633, 5453684, 3386586, 15743276, 9941491, 3981193,
    4599910, 8965174, 1361517, 516697, 10243977, 4276994, 1283371, 7283820,
    14866805, 14699256, 2419248, 15123242, 10212919, 20327, 4200618, 764560,
    12740931, 6512547, 15318902, 4592605, 5494814, 5018039, 5027471, 9401018,
    10065598, 6430665, 5671941, 55]);
  var P = e2e.BigNum.fromInternalArray([6753405, 5769422, 10224689, 15976806,
    8758122, 1072390, 4295632, 15680865, 717154, 13687529, 1112642, 8210487,
    8674065, 16472383, 4958898, 4514561, 4926786, 12952480, 2197481, 15503687,
    10446902, 15006300, 6566859, 10621344, 4856330, 3611029, 4575303, 5114846,
    10739212, 77949, 1368804, 15633764, 3877290, 2647557, 7397065, 2541923,
    15815710, 9372307, 10405740, 1046137, 8854227, 16407473, 55686]);
  var Q = e2e.BigNum.fromInternalArray([14383571, 2725147, 1528216, 12249209,
    13685854, 15618693, 14077205, 15428400, 7554178, 9206633, 2299721,
    5321660, 10331996, 12455867, 4483294, 15788877, 2961165, 14617551,
    14311372, 11919960, 15077011, 6090064, 7398736, 321109, 1846502, 12589864,
    10866071, 13127796, 6485731, 7546899, 6106326, 8535434, 792407, 13139406,
    1739551, 16321367, 11339242, 11852623, 2171797, 13046071, 15446997,
    13999581, 55773]);
  var E = [1, 0, 1];
  var D = e2e.BigNum.fromInternalArray([10820729, 13747050, 15959517, 6818106,
    5862037, 16671897, 5810502, 15842160, 3222923, 3805120, 13279531, 11699960,
    10351352, 9363391, 7867926, 6120986, 3617501, 7650412, 10463268, 16251881,
    7553626, 9240544, 7031557, 13225877, 4748514, 11304774, 8934319, 16167591,
    4492085, 7685100, 15517835, 8532384, 2072218, 442140, 10906376, 14554942,
    13278383, 3961273, 15929224, 10072494, 14940569, 11319601, 2236198, 8891069,
    3827008, 3719443, 1558550, 15342967, 7016511, 15582499, 9490273, 2197899,
    16594504, 16115018, 1041998, 16031226, 1484094, 12406232, 11208427, 1336816,
    12652050, 4451854, 424909, 424791, 2528324, 14293940, 88835, 647903,
    10368581, 551217, 8695177, 12461502, 3202524, 13840070, 2301754, 4007734,
    486777, 2944759, 16742009, 5112427, 5231125, 6843874, 1646722, 1597755,
    15416815, 23]);
  var PLAINTEXT = [2, 245, 43, 251, 48, 144, 215, 33, 150, 127, 77, 174, 246,
    202, 113, 144, 111, 34, 18, 129, 95, 33, 10, 240, 199, 80, 71, 158, 65,
    48, 180, 48, 228, 193, 224, 214, 158, 185, 64, 181, 50, 17, 173, 184, 217,
    207, 217, 69, 5, 133, 183, 161, 158, 210, 83, 90, 106, 9, 98, 3, 102, 213,
    28, 227, 58, 126, 47, 90, 154, 35, 214, 232, 227, 78, 136, 248, 223, 195,
    36, 86, 74, 96, 161, 104, 33, 132, 48, 104, 119, 171, 51, 143, 95, 186,
    102, 229, 67, 160, 114, 139, 237, 170, 65, 173, 80, 34, 150, 47, 28, 59,
    96, 51, 117, 110, 40, 213, 192, 29, 54, 201, 177, 39, 35, 164, 35, 255,
    101, 116, 196, 206, 43, 181, 92, 186, 185, 254, 100, 10, 29, 83, 19, 188,
    217, 17, 47, 200, 194, 70, 38, 203, 50, 114, 176, 51, 81, 139, 94, 181,
    213, 191, 11, 223, 221, 126, 93, 171, 208, 157, 93, 85, 77, 222, 106, 71,
    82, 45, 119, 187, 138, 202, 95, 186, 218, 135, 158, 242, 182, 60, 226,
    105, 242, 144, 235, 169, 112, 221, 23, 70, 49, 66, 80, 85, 202, 192, 170,
    163, 116, 220, 213, 22, 164, 92, 20, 104, 250, 113, 41, 63, 47, 0, 9, 19,
    169, 192, 3, 120, 200, 6, 69, 115, 124, 101, 174, 131, 50, 36, 213, 5,
    109, 207, 119, 21, 94, 210, 82, 148, 25, 61, 220, 144, 181, 138, 49, 13,
    207];
  e2e.testing.Util.addBenchmark(tests,
      function() {
        var modulus = e2e.BigNumModulus.fromBigNum(P.multiply(Q));
        // Blinding calculations
        var phi = modulus.add(e2e.BigNum.ONE).subtract(P.add(Q));
        var inv = modulus.modPower(R, phi.subtract(e2e.BigNum.ONE));
        var blinder = modulus.modPower(inv, E);
        var unblinder = R;
        // Encryption
        var c = modulus.pow(PLAINTEXT, E);
        // Decryption
        var blinded = modulus.modMultiply(new e2e.BigNum(c), blinder);
        var decryption = modulus.modPower(blinded, D);
        var plaintext = modulus.modMultiply(decryption, unblinder);
      },
      'RSA encryption & decryption');
  return e2e.testing.Util.runPerfTests(tests, 10, 40000);
};
