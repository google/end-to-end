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
 * @fileoverview Definition of e2e.messaging.AsyncRespondingChannel, which wraps
 * a MessageChannel and allows the user to get the response from the services.
 * Reimplementation of goog.messaging.RespondingChannel that transparently
 * supports goog.async.Deferred responses.
 * @author wgrose@google.com (William Grose)
 * @author koto@google.com (Krzysztof Kotowicz)
 */


goog.provide('e2e.messaging.AsyncRespondingChannel');

goog.require('goog.Disposable');
goog.require('goog.async.Deferred');
goog.require('goog.log');
goog.require('goog.messaging.MultiChannel');



/**
 * Creates a new RespondingChannel wrapping a single MessageChannel.
 * @param {goog.messaging.MessageChannel} messageChannel The messageChannel to
 *     to wrap and allow for responses. This channel must not have any existing
 *     services registered. All service registration must be done through the
 *     {@link goog.messaging.RespondingChannel#registerService} API instead.
 *     The other end of the channel must also be a RespondingChannel.
 * @constructor
 * @extends {goog.Disposable}
 */
e2e.messaging.AsyncRespondingChannel = function(messageChannel) {
  e2e.messaging.AsyncRespondingChannel.base(this, 'constructor');

  /**
   * The message channel wrapped in a MultiChannel so we can send private and
   * public messages on it.
   * @type {goog.messaging.MultiChannel}
   * @private
   */
  this.messageChannel_ = new goog.messaging.MultiChannel(messageChannel);

  /**
   * Map of invocation signatures to function callbacks. These are used to keep
   * track of the asyncronous service invocations so the result of a service
   * call can be passed back to a callback in the calling frame.
   * @type {
   *     Object<number, {callback: function(Object), errback: function(Object)}>
   * }
   * @private
   */
  this.sigCallbackMap_ = {};

  /**
   * The virtual channel to send private messages on.
   * @type {goog.messaging.MultiChannel.VirtualChannel}
   * @private
   */
  this.privateChannel_ = this.messageChannel_.createVirtualChannel(
      e2e.messaging.AsyncRespondingChannel.PRIVATE_CHANNEL_);

  /**
   * The virtual channel to send public messages on.
   * @type {goog.messaging.MultiChannel.VirtualChannel}
   * @private
   */
  this.publicChannel_ = this.messageChannel_.createVirtualChannel(
      e2e.messaging.AsyncRespondingChannel.PUBLIC_CHANNEL_);

  this.privateChannel_.registerService(
      e2e.messaging.AsyncRespondingChannel.CALLBACK_SERVICE_,
      goog.bind(this.callbackServiceHandler_, this),
      true);
};
goog.inherits(e2e.messaging.AsyncRespondingChannel, goog.Disposable);


/**
 * The name of the method invocation callback service (used internally).
 * @type {string}
 * @const
 * @private
 */
e2e.messaging.AsyncRespondingChannel.CALLBACK_SERVICE_ = 'mics';


/**
 * The name of the channel to send private control messages on.
 * @type {string}
 * @const
 * @private
 */
e2e.messaging.AsyncRespondingChannel.PRIVATE_CHANNEL_ = 'private';


/**
 * The name of the channel to send public messages on.
 * @type {string}
 * @const
 * @private
 */
e2e.messaging.AsyncRespondingChannel.PUBLIC_CHANNEL_ = 'public';


/**
 * The next signature index to save the callback against.
 * @type {number}
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.nextSignatureIndex_ = 0;


/**
 * Logger object for e2e.messaging.AsyncRespondingChannel.
 * @type {goog.log.Logger}
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.logger_ =
    goog.log.getLogger('e2e.messaging.AsyncRespondingChannel');


/**
 * Gets a random number to use for method invocation results.
 * @return {number} A unique random signature.
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.getNextSignature_ = function() {
  return this.nextSignatureIndex_++;
};


/** @override */
e2e.messaging.AsyncRespondingChannel.prototype.disposeInternal = function() {
  goog.dispose(this.messageChannel_);
  delete this.messageChannel_;
  // Note: this.publicChannel_ and this.privateChannel_ get disposed by
  //     this.messageChannel_
  delete this.publicChannel_;
  delete this.privateChannel_;
};


/**
 * Sends a message over the channel.
 * @param {string} serviceName The name of the service this message should be
 *     delivered to.
 * @param {string|!Object} payload The value of the message. If this is an
 *     Object, it is serialized to a string before sending if necessary.
 * @param {function(?Object)} callback The callback invoked with
 *     a successful result of the service call.
 * @param {function(?Object)} errback The callback invoked with
 *     an erroneous result of the service call.
 */
e2e.messaging.AsyncRespondingChannel.prototype.send = function(
    serviceName,
    payload,
    callback,
    errback) {

  var signature = this.getNextSignature_();
  this.sigCallbackMap_[signature] = {'callback': callback, 'errback': errback};

  var message = {};
  message['signature'] = signature;
  message['data'] = payload;

  this.publicChannel_.send(serviceName, message);
};


/**
 * Receives the results of the peer's service results.
 * @param {!Object|string} message The results from the remote service
 *     invocation.
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.callbackServiceHandler_ =
    function(message) {

  var signature = message['signature'];
  var result = message['data'];
  var errorResult = message['error'];

  if (signature in this.sigCallbackMap_) {
    var callback = this.sigCallbackMap_[signature].callback;
    var errback = this.sigCallbackMap_[signature].errback;
    delete this.sigCallbackMap_[signature];
    if (goog.isDefAndNotNull(errorResult)) {
      // We have an error.
      if (goog.isFunction(errback)) {
        errback(errorResult);
      } else {
        goog.log.warning(this.logger_, 'No callback to handle error.');
      }
    } else {
      // We have a successful response.
      if (goog.isFunction(callback)) {
        callback(result);
      } else {
        goog.log.warning(this.logger_, 'No callback to handle response.');
      }
    }
  } else {
    goog.log.warning(this.logger_, 'Received signature is invalid');
  }
};


/**
 * Registers a service to be called when a message is received.
 * @param {string} serviceName The name of the service.
 * @param {function(!Object)} callback The callback to process the
 *     incoming messages. Passed the payload.
 */
e2e.messaging.AsyncRespondingChannel.prototype.registerService = function(
    serviceName, callback) {
  this.publicChannel_.registerService(
      serviceName,
      goog.bind(this.callbackProxy_, this, callback),
      true);
};


/**
 * A intermediary proxy for service callbacks to be invoked and return their
 * their results to the remote caller's callback.
 * If the service callback returned a Deferred object, appropriate response
 * will be sent when the object gets resolved.
 * @param {function((string|!Object))} callback The callback to process the
 *     incoming messages. Passed the payload.
 * @param {!Object|string} message The message containing the signature and
 *     the data to invoke the service callback with.
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.callbackProxy_ = function(
    callback, message) {
  try {
    var result = callback(message['data']);
    if (result instanceof goog.async.Deferred) {
      // Send the response asynchronously.
      result.addCallbacks(
          goog.bind(this.sendSuccessResponse_, this, message),
          goog.bind(this.sendErrorResponse_, this, message));
    } else {
      // Respond immediately.
      this.sendSuccessResponse_(message, result);
    }
  } catch (anyError) {
    this.sendErrorResponse_(message, anyError);
  }
};


/**
 * Sends a successful response to a certain message to the other peer.
 * @param  {!Object|string} message  The original message.
 * @param  {*} response Response to send back.
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.sendSuccessResponse_ = function(
    message, response) {
  this.sendResponse_({'data': response, 'signature': message['signature']});
};


/**
 * Sends an error response to a certain message to the other peer.
 * @param  {!Object|string} message  The original message.
 * @param  {*} response Response to send back.
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.sendErrorResponse_ = function(
    message, response) {
  this.sendResponse_({'error': response, 'signature': message['signature']});
};


/**
 * Sends response to a certain message to the other peer.
 * @param {!Object} resultMessage The result message object to send back.
 * @private
 */
e2e.messaging.AsyncRespondingChannel.prototype.sendResponse_ = function(
    resultMessage) {
  if (this.privateChannel_) {
    // The callback invoked above may have disposed the channel so check if it
    // exists.
    this.privateChannel_.send(
        e2e.messaging.AsyncRespondingChannel.CALLBACK_SERVICE_,
        resultMessage);
  }
};
