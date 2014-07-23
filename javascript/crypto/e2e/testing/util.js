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
 * @fileoverview Common testing utilities
 *
 * @author fy@google.com (Frank Yellin)
 */

goog.provide('e2e.testing.Util');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.testing.PerformanceTable');
goog.require('goog.testing.PerformanceTimer');
goog.require('goog.testing.asserts');
goog.setTestOnly();


/**
 * Runs performance tests.
 *
 * The argument to this method should be an array of benchmark tests.  Each
 * element of the array is of the form {benchmark: <function>, label:name}
 *
 * @param {!Array.<{benchmark:!function():*, label:string}>} benchmarks
 *     An array consisting of things we want to time, and the name to show
 *     for it in the performance table.
 * @param {number=} opt_numSamples Number of times to run the test functions.
 *     Defaults to 10.
 * @param {number=} opt_timeoutInterval Number of milliseconds after which the
 *     test is to be aborted. Defaults to 5000.
 * @return {!Object.<string,Object>} Performance stats (empty when tests are
 *     run in the browser).
 */
e2e.testing.Util.runPerfTests = function(benchmarks, opt_numSamples,
    opt_timeoutInterval) {
  var timer = new goog.testing.PerformanceTimer(opt_numSamples,
      opt_timeoutInterval);
  var doc;
  try {
    doc = goog.dom.getDocument();
  } catch (e) {}
  var results = {};
  if (doc) { // We run in a browser.
      var body = goog.dom.getDocument().body;
      var perfTable = goog.dom.createElement('div');
      goog.dom.appendChild(body, perfTable);
      var table = new goog.testing.PerformanceTable(perfTable, timer);
      goog.array.forEach(benchmarks, function(benchmark) {
        table.run(benchmark.benchmark, benchmark.label);
      });
  } else {
      goog.array.forEach(benchmarks, function(benchmark) {
        results[benchmark.label] = timer.run(benchmark.benchmark);
      });
  }
  return results;
};

/**
 * Adds a benchmark function to performance test array.
 * @param {!Array.<!{benchmark:!function():*, label:string}>} benchmarks Array
 *     to add benchmark to.
 * @param {!function():*} fun Benchmark test to add
 * @param {string} label Benchmark test label
 */
e2e.testing.Util.addBenchmark = function(benchmarks, fun, label) {
  benchmarks.push({
      benchmark: fun,
      label: label
  });
};


/**
 * Checks if the test URL has been called with runPerf parameter. To be used in
 * performance test HTML files in shouldRunTests function.
 * @return {boolean} True if runPerf is present in the URL, false otherwise.
 */
e2e.testing.Util.hasRunPerfParameter = function() {
  if (goog.dom.getDocument().location.href.indexOf('runPerf') !== -1) {
    return true;
  }
  console.log('Add runPerf parameter to the URL to run this performance test.');
  return false;
};
