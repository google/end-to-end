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
 * @fileoverview Defines types that can be safely serialized and deserialized
 *     to/from JSON.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.Storable');



/**
 * An interface for serializing to Uint8Array.
 * @constructor
 */
e2e.otr.Storable = function() {
  assert(this.constructor != e2e.otr.Storable);
  assert(goog.isFunction(this.constructor.unpack));
};


/**
 * Provides a JSON.stringify-able representation of the class.
 * @return {*} The serialized data.
 */
e2e.otr.Storable.prototype.pack = goog.abstractMethod;


/**
 * Instantiates a class from a parsed JSON representation.
 * @param {*} json The parsed JSON representation.
 * @return {!e2e.otr.Storable} The class instance.
 */
e2e.otr.Storable.unpack = goog.abstractMethod;
