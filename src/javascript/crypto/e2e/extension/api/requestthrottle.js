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
 * @fileoverview Counts the number of requests in a given minute and signals if
 * an incoming request can be processed.
 */

goog.provide('e2e.ext.api.RequestThrottle');

goog.require('goog.Disposable');
goog.require('goog.array');

goog.scope(function() {
var api = e2e.ext.api;



/**
 * Constructor for the request throttle.
 * @param {number} maxRequestsPerMinute The maximum allowed requests per minute.
 * @constructor
 * @extends {goog.Disposable}
 */
api.RequestThrottle = function(maxRequestsPerMinute) {
  goog.base(this);

  /**
   * The timestamps of the previously processed requests.
   * @type {!Array.<number>}
   * @private
   */
  this.processedRequests_ = [];

  /**
   * The maximum allowed requests per minute.
   * @type {number}
   * @private
   */
  this.maxRequestsPerMinute_ = maxRequestsPerMinute;
};
goog.inherits(api.RequestThrottle, goog.Disposable);


/**
 * The offset to calculate the beginning of a cycle during which the maximum
 * number of requests is to be counted.
 * @type {number}
 * @private
 * @const
 */
api.RequestThrottle.PERIOD_OFFSET_ = 60 * 1000; // 1 minute.


/** @override */
api.RequestThrottle.prototype.disposeInternal = function() {
  this.processedRequests_ = [];
  goog.base(this, 'disposeInternal');
};


/**
 * Signals if the request can proceed.
 * @return {boolean} True if the request can proceed. Otherwise false.
 */
api.RequestThrottle.prototype.canProceed = function() {
  var now = goog.now();
  var cutoffTimestamp = now - api.RequestThrottle.PERIOD_OFFSET_;
  this.processedRequests_ = goog.array.filter(
      this.processedRequests_, function(requestTimestamp) {
        return requestTimestamp > cutoffTimestamp;
      });

  if (this.processedRequests_.length < this.maxRequestsPerMinute_) {
    this.processedRequests_.push(now);
    return true;
  }

  return false;
};

});  // goog.scope
