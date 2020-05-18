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
 * @fileoverview Unit tests for testing utilities.
 * @author koto@google.com (Krzysztof Kotowicz)
 */

/** @suppress {extraProvide} */
goog.provide('e2e.testing.UtilTest');

goog.require('e2e.testing.Util');
goog.require('goog.async.Deferred');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);


function testAddBenchmark() {
  var benchmarks = [];
  e2e.testing.Util.addBenchmark(benchmarks, goog.nullFunction, 'dummy');
  assertEquals(1, benchmarks.length);
  assertEquals('dummy', benchmarks[0].label);
  assertEquals(goog.nullFunction, benchmarks[0].benchmark);
  assertEquals(false, benchmarks[0].async);
  e2e.testing.Util.addBenchmark(benchmarks, goog.abstractFunction, 'async',
      true);
  assertEquals(2, benchmarks.length);
  assertEquals('async', benchmarks[1].label);
  assertEquals(goog.abstractFunction, benchmarks[1].benchmark);
  assertEquals(true, benchmarks[1].async);
}


function testSynchronous() {
  var benchmarks = [];
  var counter = 0;
  var increment = function() {
    counter++;
  };
  e2e.testing.Util.addBenchmark(benchmarks, increment, 'dummy');
  e2e.testing.Util.addBenchmark(benchmarks, increment, 'second');
  asyncTestCase.waitForAsync('waiting for tests to complete.');
  var results = e2e.testing.Util.runPerfTests(benchmarks, 10);
  results.then(function(results) {
    assertEquals(20, counter); // 2 * 10 tests.
    assertNotNull(results['dummy']);
    assertNotNull(results['second']);
    assertEquals(10, results['dummy'].count);
    asyncTestCase.continueTesting();
  });
}


function testAsynchronous() {
  var benchmarks = [];
  var counter = 0;
  var increment = function() {
    counter++;
  };
  e2e.testing.Util.addBenchmark(benchmarks, increment, 'sync');
  e2e.testing.Util.addBenchmark(benchmarks, function() {
    var deferred = new goog.async.Deferred();
    setTimeout(function() {
      increment();
      deferred.callback();
    }, 20);
    return deferred;
  }, 'async', true);
  e2e.testing.Util.addBenchmark(benchmarks, increment, '2nd sync');
  asyncTestCase.waitForAsync('waiting for tests to complete.');
  var results = e2e.testing.Util.runPerfTests(benchmarks, 5);
  results.then(function(results) {
    assertEquals(counter, 15); // All 3 * 5 tests completed now.
    assertEquals(5, results['async'].count);
    assertTrue(results['async'].average > 0);
    asyncTestCase.continueTesting();
  });
}
