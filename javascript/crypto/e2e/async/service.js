// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Service for Port-based asynchronous services.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Service');

goog.require('e2e.async.Bid');
goog.require('e2e.async.BidResponse');
goog.require('e2e.async.Result');



/**
 * Class for the service-side part of the Port-based asynchronous service.
 * @param {MessagePort=} opt_port The port to register the service on.
 * @constructor
 */
e2e.async.Service = function(opt_port) {
  if (goog.isDef(opt_port)) {
    this.setPort(opt_port);
  }
};


/**
 * The port to use for the service.
 * @type {MessagePort}
 * @private
 */
e2e.async.Service.prototype.port_;


/**
 * Register the service in a given port.
 * @param {MessagePort} port The port to register the service on.
 */
e2e.async.Service.prototype.setPort = function(port) {
  this.port_ = port;
  this.port_.onmessage = goog.bind(this.handleMessage_, this);
};


/**
 * @param {MessagePort} port The port to respond to.
 * @param {*} returnValue The return value of the function.
 * @param {string} error The error to send.
 * @private
 */
e2e.async.Service.prototype.return_ = function(port, returnValue, error) {
  port.postMessage({
    'returnValue': returnValue,
    'error': error
  });
};


/**
 * Handles all incoming messages to this service.
 * @param {MessageEvent.<*>} event The message event to handle.
 * @private
 */
e2e.async.Service.prototype.handleMessage_ = function(event) {
  var methodName = '_public_' + event.data['method'];
  var port = event.ports[0];
  var returnValue, error;

  if (typeof this[methodName] == 'function') {
    var methodFunction = this[methodName];
    try {
      returnValue = methodFunction.apply(this, event.data.arguments);
      if (e2e.async.Result && returnValue instanceof e2e.async.Result) {
        returnValue.addCallback(function(ret) {
          this.return_(port, ret, '');
        }, this).addErrback(function(err) {
          this.return_(port, undefined, String(err));
        }, this);
      } else {
        this.return_(port, returnValue, '');
      }
    } catch (e) {
      if (e instanceof Error) {
        this.return_(port, undefined, String(e.message));
      } else {
        this.return_(port, undefined, 'Unknown error.');
      }
    }
  } else {
    this.return_(port, undefined, 'Tried to call nonexistent method.');
  }
};


/**
 * Name of this service implementation.
 * @type {string}
 */
e2e.async.Service.prototype.name = 'Generic Service';


/**
 * Returns the response to a bid from a client.
 * @param {e2e.async.Bid} bid Service specific information.
 * @return {e2e.async.BidResponse} The response to the bid.
 */
e2e.async.Service.prototype.getResponse = function(bid) {
  return {
    'name': this.name
  };
};
