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
 * @fileoverview Common testing utilities
 *
 * @author fy@google.com (Frank Yellin)
 * @author koto@google.com (Krzysztof Kotowicz) (rewrite, async tests, promises)
 */

goog.provide('e2e.testing.Util');

goog.require('goog.Promise');
goog.require('goog.dom');
goog.require('goog.testing.PerformanceTable');
goog.require('goog.testing.PerformanceTimer');
goog.require('goog.testing.asserts');
goog.setTestOnly();


/**
 * Runs performance tests.
 *
 * The argument to this method should be an array of benchmark tests.  Each
 * element of the array is of the form {benchmark: function, label:name}
 *
 * @param {!Array.<{benchmark:!function():*, label:string}>} benchmarks
 *     An array consisting of things we want to time, and the name to show
 *     for it in the performance table.
 * @param {number=} opt_numSamples Number of times to run the test functions.
 *     Defaults to 10.
 * @param {number=} opt_timeoutInterval Number of milliseconds after which the
 *     test is to be aborted. Defaults to 5000.
 * @return {!goog.Promise.<!Object.<!string,!Object>>} Performance stats
 *     promise. Promise will be resolved when last test completes.
 */
e2e.testing.Util.runPerfTests = function(benchmarks, opt_numSamples,
    opt_timeoutInterval) {
  var timer = new goog.testing.PerformanceTimer(opt_numSamples,
      opt_timeoutInterval);
  var doc;
  try {
    doc = goog.dom.getDocument();
  } catch (e) {}
  var allResults = {};
  var displayResultsFun;
  if (doc) { // We run in a browser.
    displayResultsFun = e2e.testing.Util.createPerformanceTable(timer);
  }

  var processTaskResults = function(label, taskResults) {
    allResults[label] = taskResults;
    if (goog.isFunction(displayResultsFun)) {
      displayResultsFun(label, taskResults);
    }
  };

  var i = 0;
  var runNextTask = function() {
    var benchmark = benchmarks[i];
    ++i;
    var task = new goog.testing.PerformanceTimer.Task(benchmark.benchmark);
    var completionPromise;
    if (benchmark.async) {
      completionPromise = timer.runAsyncTask(task).then(
          goog.bind(processTaskResults, this, benchmark.label));
    } else {
      completionPromise = goog.Promise.resolve(
          processTaskResults(benchmark.label, timer.runTask(task)));
    }
    if (i < benchmarks.length) {
      return completionPromise.then(runNextTask);
    } else {
      return completionPromise;
    }
  };

  return runNextTask().then(function() {
    return allResults;
  });
};


/**
 * Creates performance table in the DOM to display the results in.
 * @param  {goog.testing.PerformanceTimer} timer Performance timer to use.
 * @return {?function(!string,!Object)} callback function filling the results
 *    in the created table
 */
e2e.testing.Util.createPerformanceTable = function(timer) {
  var body = goog.dom.getDocument().body;
  var perfTable = goog.dom.createElement('div');
  goog.dom.appendChild(body, perfTable);
  var table = new goog.testing.PerformanceTable(perfTable, timer);
  return function(label, taskResults) {
    table.recordResults(taskResults, label);
  };
};


/**
 * Adds a benchmark function to performance test array.
 * Benchmark function will be executed repeatedly and the execution time will be
 * measured. Return values and errors thrown from the function are ignored.
 * @param {!Array.<!{benchmark:!function():?goog.async.Deferred, label:string,
 *     async: boolean}>} benchmarks Array to add the benchmark to.
 * @param {!function():?goog.async.Deferred} fun Benchmark test to add. The
 *     function execution time will be measured. Iff opt_async is true,
 *     the function should return a deferred and execute deferred callback()
 *     when the test is complete.
 * @param {string} label Benchmark test label
 * @param {boolean=} opt_async Iff true, the test is asynchronous.
 */
e2e.testing.Util.addBenchmark = function(benchmarks, fun, label, opt_async) {
  benchmarks.push({
    benchmark: fun,
    label: label,
    async: Boolean(opt_async)
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
