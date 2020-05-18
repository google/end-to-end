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

goog.require('e2e.async.Result');
goog.require('e2e.async.WorkerSelf');
goog.require('e2e.ext.utils.IndexedDbStorage');
goog.require('e2e.openpgp.ContextImpl');
goog.require('e2e.openpgp.ContextService');


/**
 * Bootstrap function for the code in the Web Worker.
 */
e2e.openpgp.worker.bootstrap = function() {
  var contextPromise = new e2e.async.Result();
  new e2e.ext.utils.IndexedDbStorage('keyring', function(storage) {
    contextPromise.callback(new e2e.openpgp.ContextImpl(storage));
  });
  var workerPeer = new e2e.async.WorkerSelf();
  e2e.openpgp.ContextService.launch(workerPeer, contextPromise);
};

e2e.openpgp.worker.bootstrap();
