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
 * @fileoverview Does discovery and provisioning to a group of ports.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Broker');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.async.Bid');
goog.require('e2e.async.Result');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');



/**
 * Class that provides discovery and provisioning to a group of ports.
 * @param {!Array.<!MessagePort>} ports Ports to broke services in.
 * @constructor
 */
e2e.async.Broker = function(ports) {
  /**
   * Dictionary of all service constructors.
   * @type {Object.<string, Array.<function(new:e2e.async.Service,
   *     MessagePort)>>}
   * @private
   */
  this.services_ = {};
  /**
   * List of ports to use for this broker.
   * @type {!Array.<!MessagePort>}
   * @private
   */
  this.ports_ = [];
  this.addPorts(ports);
};


/**
 * Initializes the broker.
 */
e2e.async.Broker.prototype.init = goog.abstractMethod;


/**
 * Whether the broker has been initialized.
 * @type {boolean}
 * @private
 */
e2e.async.Broker.prototype.initialized_ = false;


/**
 * Initializes the broker exactly once.
 */
e2e.async.Broker.prototype.initOnce = function() {
  if (this.initialized_) return;
  this.init();
  this.initialized_ = true;
};


/**
 * Actions used in Broker messages.
 * @enum {string}
 */
e2e.async.Broker.Action = {
  'DISCOVERY': 'DISCOVERY',
  'RESPONSE': 'RESPONSE'
};


/**
 * Definition of the broker event data.
 * @typedef {{action: e2e.async.Broker.Action, serviceName: string?,
 *     bid: e2e.async.Bid?, response: e2e.async.BidResponse?, error:string?}}
 */
e2e.async.Broker.EventData;


/**
 * Error messages for the broker.
 * @enum {string}
 */
e2e.async.Broker.Error = {
  'FIND_SERVICE_TIMEOUT': 'FIND_SERVICE_TIMEOUT'
};


/**
 * Adds the given ports to the list of ports used by this broker.
 * @param {!Array.<!MessagePort>} ports Ports to broke services in.
 */
e2e.async.Broker.prototype.addPorts = function(ports) {
  goog.array.forEach(ports, goog.bind(this.addPort, this));
};


/**
 * Adds a specific port to the list of ports used by this broker.
 * @param {MessagePort} port Port to broke services in.
 */
e2e.async.Broker.prototype.addPort = function(port) {
  port.onmessage = goog.bind(this.messageHandler_, this);
  this.ports_.push(port);
};


/**
 * Instantiates all services registered for a specific name.
 * @param {string} name
 * @param {!e2e.async.Bid} bid
 * @param {!MessagePort} port
 * @protected
 */
e2e.async.Broker.prototype.createServices = function(name, bid, port) {
  var services = this.services_[name];
  if (services) {
    goog.array.forEach(services, goog.bind(
        this.createService_, this, port, bid));
  }
};


/**
 * Handles messages sent via the broker ports.
 * @param {!MessageEvent.<!e2e.async.Broker.EventData>} e The event to handle.
 * @private
 */
e2e.async.Broker.prototype.messageHandler_ = function(e) {
  if (e.data.action === e2e.async.Broker.Action.DISCOVERY) {
    var responsePort = goog.asserts.assertObject(e.ports[0]);
    var serviceName = e.data.serviceName || '';
    this.createServices(serviceName, goog.asserts.assertObject(e.data.bid),
                        responsePort);
  }
};


/**
 * Creates a service and processes the bid response.
 * @param {!MessagePort} responsePort The port created for the service.
 * @param {!e2e.async.Bid} bid The bid sent by the service.
 * @param {function(new:e2e.async.Service, !MessagePort)} service The service
 *     constructor.
 * @private
 */
e2e.async.Broker.prototype.createService_ = function(
    responsePort, bid, service) {
  var mc = new MessageChannel();
  var svc = new service(mc.port1);
  svc.getResponse(bid).addCallbacks(function(bidResponse) {
    this.respondBid(responsePort, bidResponse, mc.port2);
  }, function(error) {
    this.respondBidError(responsePort, error);
  }, this);
};


/**
 * Sends a service bid response.
 * @param {!MessagePort} responsePort The port to send the response through.
 * @param {!e2e.async.BidResponse} bidResponse The bid response.
 * @param {!MessagePort} servicePort The service port to send further requests
 *    through.
 * @protected
 */
e2e.async.Broker.prototype.respondBid = function(
    responsePort, bidResponse, servicePort) {
  responsePort.postMessage({
    'action': e2e.async.Broker.Action.RESPONSE,
    'response': bidResponse
  }, [servicePort]);
};


/**
 * Sends a service error response.
 * @param {!MessagePort} responsePort The port to send the response through.
 * @param {string} errorMessage The error message.
 * @protected
 */
e2e.async.Broker.prototype.respondBidError = function(
    responsePort, errorMessage) {
  responsePort.postMessage({
    'action': e2e.async.Broker.Action.RESPONSE,
    'error': errorMessage
  });
};


/**
 * Registers a service on some serviceName.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {function(new:e2e.async.Service, !MessagePort)} service The service
 *     to register it for.
 */
e2e.async.Broker.prototype.registerService = function(serviceName, service) {
  this.initOnce();
  var services = this.services_[serviceName];
  if (!services) {
    services = this.services_[serviceName] = [];
  }
  services.push(service);
};


/**
 * Finds all services of a specific name that respond to a given Bid.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {!e2e.async.Bid} bid An object that has details specific to the
 *    service.
 * @param {number=} opt_timeout Timeout in ms. After the timeout, errback is
 *    triggered for all non-resolved results.
 * @return {!Array.<!e2e.async.ServiceLookupResponseResult>} Asynchronous
 *    results that get resolved when registered services respond to a bid. Each
 *    result may trigger an errback on service error or timeout.
 */
e2e.async.Broker.prototype.findServices = function(
    serviceName, bid, opt_timeout) {
  this.initOnce();

  var results = goog.array.map(this.ports_, goog.bind(
      this.findServiceInPort_, this, serviceName, bid));

  if (goog.isDef(opt_timeout)) {
    goog.Timer.callOnce(function() {
      goog.array.forEach(results, function(result) {
        if (!result.hasFired()) {
          result.errback(e2e.async.Broker.Error.FIND_SERVICE_TIMEOUT);
        }
      });
    }, opt_timeout);
  }

  return results;
};


/**
 * Finds a first service of a specific name that responded to a given Bid.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {!e2e.async.Bid} bid An object that has details specific to the
 *    service.
 * @param {number=} opt_timeout Timeout in ms. After the timeout, the errback is
 *    triggered if the service did not yet respond.
 * @return {!e2e.async.ServiceLookupResponseResult} Result that will be resolved
 *    with a first service that responded to a Bid.
 */
e2e.async.Broker.prototype.findService = function(
    serviceName, bid, opt_timeout) {
  var firstResult = new e2e.async.Result();
  var results = this.findServices(serviceName, bid, opt_timeout);
  var cancelResult = /** @type {function(e2e.async.Result)} */ (
      function(result) {
        result.cancel();
      });
  goog.array.forEach(results, function(result) {
    result.addCallbacks(function(findServiceResponse) {
      goog.array.forEach(results, cancelResult);
      firstResult.callback(findServiceResponse);
    }, function(error) {
      goog.array.forEach(results, cancelResult);
      firstResult.errback(error);
    });
  });
  return firstResult;
};


/**
 * Finds if a specific port provides a service.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {!e2e.async.Bid} bid An object that has details specific to the
 *     service.
 * @param {!MessagePort} port The port to search the service on.
 * @return {!e2e.async.ServiceLookupResponseResult} Service discovery response.
 * @private
 */
e2e.async.Broker.prototype.findServiceInPort_ = function(
    serviceName, bid, port) {
  var result = new e2e.async.Result();
  var mc = new MessageChannel();
  port.postMessage({
    'action': e2e.async.Broker.Action.DISCOVERY,
    'serviceName': serviceName,
    'bid': bid
  }, [mc.port2]);
  mc.port1.onmessage = goog.bind(this.discoveryMessageHandler_, this, result);
  return result;
};


/**
 * Handles the response of a message sent for discovery. Will throw an error if
 * the service responded with an error, otherwise a callback will be called.
 * @param {!e2e.async.ServiceLookupResponseResult} responseResult Result to
 *     resolve with the response.
 * @param {!MessageEvent.<!e2e.async.Broker.EventData>} e The event sent as
 *     response to the request.
 * @private
 */
e2e.async.Broker.prototype.discoveryMessageHandler_ = function(responseResult,
    e) {
  if (responseResult.hasFired()) {
    return;
  }
  if (e.data.action === e2e.async.Broker.Action.RESPONSE) {
    if (goog.object.containsKey(e.data, 'error')) {
      responseResult.errback(String(e.data.error));
      return;
    }
    var response = /** @type {e2e.async.ServiceLookupResponse} */ ({
      port: goog.asserts.assertObject(e.ports[0]),
      response: goog.asserts.assertObject(e.data.response)
    });
    responseResult.callback(response);
    return;
  }
};


/**
 * Returns the list of ports being used by this broker.
 * @return {!Array.<!MessagePort>} The list of ports to use.
 */
e2e.async.Broker.prototype.getPorts = function() {
  return this.ports_;
};
