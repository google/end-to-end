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
 * @fileoverview Defines the types used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.Serializable');



/**
 * An interface for serializing to Uint8Array.
 * @interface
 */
e2e.otr.Serializable = goog.abstractMethod;


/**
 * Provides a Uint8Array representation of the class.
 * @return {!Uint8Array} The serialized data.
 */
e2e.otr.Serializable.prototype.serialize = goog.abstractMethod;
