/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Represent a Worker from the Worker's perspective.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.WorkerSelf');

goog.require('e2e.async.ForeignPeer');



/**
 * Class used to represent a worker's own global scope as a foreign peer.
 * @extends {e2e.async.ForeignPeer}
 * @constructor
 */
e2e.async.WorkerSelf = function() {
  goog.base(this, self);
};
goog.inherits(e2e.async.WorkerSelf, e2e.async.ForeignPeer);


/** @inheritDoc */
e2e.async.WorkerSelf.prototype.validateMessage = function(e) {
  // A worker can only be invoked by same-origin principals.
  return true;
};
