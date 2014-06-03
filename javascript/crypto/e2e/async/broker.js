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
 * @fileoverview Does discovery and provisioning to a group of ports.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Broker');

goog.require('e2e.async.Bid');
goog.require('e2e.async.BidResponse');
goog.require('e2e.async.Service');
goog.require('goog.array');


/**
 * Class that provides discovery and provisioning to a group of ports.
 * @param {Array.<MessagePort>} ports Ports to broke services in.
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
   * @type {Array.<MessagePort>}
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
 *     bid: e2e.async.Bid?, response: e2e.async.BidResponse?}}
 */
e2e.async.Broker.EventData;


/**
 * Adds the given ports to the list of ports used by this broker.
 * @param {Array.<MessagePort>} ports Ports to broke services in.
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
 * @param {e2e.async.Bid} bid
 * @param {MessagePort} port
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
 * @param {MessageEvent.<e2e.async.Broker.EventData>} e The event to handle.
 * @private
 */
e2e.async.Broker.prototype.messageHandler_ = function(e) {
  if (e.data.action === e2e.async.Broker.Action.DISCOVERY) {
    var responsePort = e.ports[0];
    var serviceName = e.data.serviceName || '';
    this.createServices(serviceName, e.data.bid, responsePort);
  }
};


/**
 * @param {MessagePort} responsePort The port created for the service.
 * @param {e2e.async.Bid} bid The bid sent by the service.
 * @param {function(new:e2e.async.Service, MessagePort)} service The service
 *     constructor.
 * @private
 */
e2e.async.Broker.prototype.createService_ = function(
    responsePort, bid, service) {
  var mc = new MessageChannel();
  var svc = new service(mc.port1);
  this.respondBid(responsePort, svc.getResponse(bid), mc.port2);
};


/**
 * @param {MessagePort} responsePort
 * @param {e2e.async.BidResponse} bidResponse
 * @param {MessagePort} servicePort
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
 * Registers a service on some serviceName.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {function(new:e2e.async.Service, MessagePort)} service The service
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
 * Finds a service of a specific name and returns it's URL.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {e2e.async.Bid} bid An object that has details specific to the
 *     service.
 * @param {function(e2e.async.BidResponse, MessagePort)} callback Callback to
 *     return responses.
 */
e2e.async.Broker.prototype.findService = function(
    serviceName, bid, callback) {
  this.initOnce();
  goog.array.forEach(this.ports_, goog.bind(
      this.findServiceInPort_, this, serviceName, bid, callback));
};


/**
 * Finds if a specific port provides a service.
 * @param {string} serviceName The name of the service in the format of a URL.
 * @param {e2e.async.Bid} bid An object that has details specific to the
 *     service.
 * @param {function(e2e.async.BidResponse, MessagePort)} callback Callback to
 *     return responses.
 * @param {MessagePort} port The port to search the service on.
 * @private
 */
e2e.async.Broker.prototype.findServiceInPort_ = function(
    serviceName, bid, callback, port) {
  var mc = new MessageChannel();
  port.postMessage({
    'action': e2e.async.Broker.Action.DISCOVERY,
    'serviceName': serviceName,
    'bid': bid
  }, [mc.port2]);
  mc.port1.onmessage = goog.bind(this.discoveryMessageHandler_, this, callback);
};


/**
 * Handles the response of a message sent for discovery.
 * @param {function(e2e.async.BidResponse, MessagePort)} callback Callback to
 *     return responses.
 * @param {MessageEvent.<e2e.async.Broker.EventData>} e The event sent as
 *     response to the request.
 * @private
 */
e2e.async.Broker.prototype.discoveryMessageHandler_ = function(callback, e) {
  if (e.data.action === e2e.async.Broker.Action.RESPONSE) {
    var servicePort = e.ports[0];
    callback(e.data.response, servicePort);
  }
};


/**
 * Returns the list of ports being used by this broker.
 * @return {Array.<MessagePort>} The list of ports to use.
 */
e2e.async.Broker.prototype.getPorts = function() {
  return this.ports_;
};
