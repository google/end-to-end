// Copyright 2011 Google Inc. All rights reserved.
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
 * @fileoverview Performance testing for various ECC operations.
 *
 * @author fy@google.com (Frank Yellin)
 */

goog.provide('e2e.ecc.eccTester');

goog.require('e2e.ecc.DomainParam');
goog.require('e2e.ecc.ECDSA');
goog.require('e2e.ecc.Protocol');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.testing.PerformanceTable');
goog.require('goog.testing.PerformanceTimer');
goog.require('goog.testing.asserts');
goog.setTestOnly('eccTester');


/**
 * Runs performance tests.
 *
 * The argument to this method should be an array of benchmark tests.  Each
 * element of the array is of the form {benchmark: <function>, label:name}
 *
 * @param {!Array.<{benchmark:!function():*, label:string}>} benchmarks
 *     An array consisting of things we want to time, and the name to show
 *     for it in the performance table.
 */
e2e.ecc.eccTester.runPerfTest = function(benchmarks) {
  var timer = new goog.testing.PerformanceTimer(10, 10000);
  var body = goog.dom.getDocument().body;
  var perfTable = goog.dom.createElement('div');
  goog.dom.appendChild(body, perfTable);
  var table = new goog.testing.PerformanceTable(perfTable, timer);
  goog.array.forEach(benchmarks, function(benchmark) {
    table.run(benchmark.benchmark, benchmark.label);
  });
};


/**
 * Benchmarks for a given curve.
 * @param {!e2e.ecc.PrimeCurve.<string>} curve The curve
 */
e2e.ecc.eccTester.runBenchmarkForCurve = function(curve) {
  var message = 'Whisky bueno: ¡excitad mi frágil pequeña vejez!';
  var params = e2e.ecc.DomainParam.fromCurve(curve);
  var keypair = e2e.ecc.Protocol.generateKeyPair(curve);
  var ecdsa = new e2e.ecc.ECDSA(curve, keypair);
  var signature = ecdsa.sign(message);
  var tests = [
    {
      benchmark: function() { params.g.multiply(params.n); },
      label: curve + ' Fast Multiply'
    },
    {
      benchmark: function() { params.g.negate().multiply(params.n); },
      label: curve + ' Slow Multiply'
    },
    {
      benchmark: function() { params.n.modInverse(params.curve.B.toBigNum()); },
      label: curve + ' Bignum modInverse'
    },
    {
      benchmark: function() { ecdsa.sign(message); },
      label: curve + ' Sign'
    },
    {
      benchmark: function() {ecdsa.verify(message, signature); },
      label: curve + ' Verify'
    }
  ];
  e2e.ecc.eccTester.runPerfTest(tests);
};
