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
 * @fileoverview Defines general purpose utilities for async communication.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Bid');
goog.provide('e2e.async.BidResponse');
goog.provide('e2e.async.ServiceLookupResponse');
goog.provide('e2e.async.ServiceLookupResponseResult');


/**
 * Holds service-specific requirements to the service at discovery time.
 * @typedef {Object}
 */
e2e.async.Bid;


/**
 * Holds service-specific response to the client at discovery time.
 * @typedef {Object}
 */
e2e.async.BidResponse;


/**
 * Holds service response to the client at discovery time.
 * @typedef {{port: !MessagePort, response: !e2e.async.BidResponse}}
 */
e2e.async.ServiceLookupResponse;


/**
 * Holds an asynchronous result of a service discovery.
 * @typedef {!e2e.async.Result.<!e2e.async.ServiceLookupResponse>}
 */
e2e.async.ServiceLookupResponseResult;
