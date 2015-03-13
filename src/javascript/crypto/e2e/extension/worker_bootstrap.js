/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview OpenPGP Context WebWorker bootstrap file.
 */

goog.provide('e2e.openpgp.worker.bootstrap');

goog.require('e2e.ext.utils.IndexedDbStorage');
goog.require('e2e.openpgp.ContextImpl');
goog.require('e2e.openpgp.ContextService');
goog.require('goog.messaging.BufferedChannel');
goog.require('goog.messaging.PortChannel');


/**
 * Bootstrap function for the code in the Web Worker.
 * @suppress {checkTypes} Workaround. 'self' is a DedicatedWorkerGlobalScope,
 *     but is also a WebWorker that PortChannel requires.
 */
e2e.openpgp.worker.bootstrap = function() {
  // Initialize keyring storage mechanism and create a context service.
  new e2e.ext.utils.IndexedDbStorage('keyring', function(storage) {
    var context = new e2e.openpgp.ContextImpl(storage);
    var channel = new goog.messaging.BufferedChannel(
        new goog.messaging.PortChannel(/* type !WebWorker */ (self)));
    self.service = new e2e.openpgp.ContextService(context, channel);
  });
};

e2e.openpgp.worker.bootstrap();
