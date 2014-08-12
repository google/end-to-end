// Copyright 2014 Google Inc. All Rights Reserved.
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
 * @fileoverview OTR session manager.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.Session');

goog.require('e2e.otr');
goog.require('e2e.otr.constants');


goog.scope(function() {

var constants = e2e.otr.constants;


/**
 * A session maintaining the state and configuration of an OTR conversation.
 * @constructor
 * @param {!e2e.otr.Int} instanceTag The client's instance tag.
 * @param {!e2e.otr.Policy} opt_policy Policy params to be set on the session.
 */
e2e.otr.Session = function(instanceTag, opt_policy) {
  this.policy_ = goog.object.clone(constants.DEFAULT_POLICY);
  this.updatePolicy(opt_policy || {});

  this.messageState = constants.MSGSTATE.PLAINTEXT;
  this.authState = constants.AUTHSTATE.NONE;
  this.remoteInstanceTag = new Uint8Array([0, 0, 0, 0]);

  this.instanceTag = instanceTag;
  assert(e2e.otr.intToNum(this.instanceTag) >= 0x100);
};


/**
 * Updates the session policies.
 * @param {!e2e.otr.Policy} policy Policy params to be set on the session.
 */
e2e.otr.Session.prototype.updatePolicy = function(policy) {
  goog.object.extend(this.policy_, policy);
};


/**
 * Gets one or all policy settings.
 * @param {string=} opt_name Policy value to return.  Omitted or '' returns all.
 * @return {boolean|!e2e.otr.Policy|undefined}
 */
e2e.otr.Session.prototype.getPolicy = function(opt_name) {
  return opt_name ? this.policy_[opt_name] : goog.object.clone(this.policy_);
};


/**
 * Handles incoming messages.
 * @param {!Uint8Array} serialized A serialized message.
 */
e2e.otr.Session.prototype.processMessage = function(serialized) {
  throw new Error('Not yet implemented.');
};
});
