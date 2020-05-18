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

goog.provide('e2e.messaging.AsyncRespondingChannelTest');
goog.setTestOnly('e2e.messaging.AsyncRespondingChannelTest');

goog.require('e2e.messaging.AsyncRespondingChannel');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.messaging.MockMessageChannel');

var CH1_REQUEST = {'request': 'quux1'};
var CH2_REQUEST = {'request': 'quux2'};
var CH1_RESPONSE = {'response': 'baz1'};
var CH2_ERROR = new Error('an error');
var CH2_RESPONSE = {'response': 'baz2'};
var SERVICE_NAME = 'serviceName';

var mockControl;
var ch1;
var ch2;
var respondingCh1;
var respondingCh2;

function setUp() {
  mockControl = new goog.testing.MockControl();

  ch1 = new goog.testing.messaging.MockMessageChannel(mockControl);
  ch2 = new goog.testing.messaging.MockMessageChannel(mockControl);

  respondingCh1 = new e2e.messaging.AsyncRespondingChannel(ch1);
  respondingCh2 = new e2e.messaging.AsyncRespondingChannel(ch2);
}

function tearDown() {
  respondingCh1.dispose();
  respondingCh2.dispose();
  mockControl.$verifyAll();
}

function testSendWithSignature() {
  // 1 to 2 and back.
  var message1Ch1Request = {'data': CH1_REQUEST,
    'signature': 0};
  var message1Ch2Response = {'data': CH2_RESPONSE,
    'signature': 0};
  var message2Ch1Request = {'data': CH1_REQUEST,
    'signature': 1};
  var message2Ch2Response = {'data': CH2_RESPONSE,
    'signature': 1};
  var message3Ch1Request = {'data': CH1_REQUEST,
    'signature': 2};
  var message3Ch2Response = {'error': CH2_ERROR,
    'signature': 2};
  // 2 to 1 and back.
  var message3Ch2Request = {'data': CH2_REQUEST,
    'signature': 0};
  var message3Ch1Response = {'data': CH1_RESPONSE,
    'signature': 0};
  var message4Ch2Request = {'data': CH2_REQUEST,
    'signature': 1};
  var message4Ch1Response = {'data': CH1_RESPONSE,
    'signature': 1};

  // 1 to 2 and back.
  ch1.send(
      'public:' + SERVICE_NAME,
      message1Ch1Request);
  ch2.send(
      'private:mics',
      message1Ch2Response);
  ch1.send(
      'public:' + SERVICE_NAME,
      message2Ch1Request);
  ch2.send(
      'private:mics',
      message2Ch2Response);
  ch1.send(
      'public:' + SERVICE_NAME,
      message3Ch1Request);
  ch2.send(
      'private:mics',
      message3Ch2Response);

  // 2 to 1 and back.
  ch2.send(
      'public:' + SERVICE_NAME,
      message3Ch2Request);
  ch1.send(
      'private:mics',
      message3Ch1Response);
  ch2.send(
      'public:' + SERVICE_NAME,
      message4Ch2Request);
  ch1.send(
      'private:mics',
      message4Ch1Response);

  mockControl.$replayAll();

  var hasInvokedCh1 = 0;
  var hasInvokedCh2 = 0;
  var hasReturnedFromCh1 = 0;
  var hasReturnedFromCh2 = 0;
  var hasReturnedErrorFromCh2 = 0;

  var serviceCallback1 = function(message) {
    hasInvokedCh1++;
    assertObjectEquals(CH2_REQUEST, message);
    return CH1_RESPONSE;
  };

  var serviceCallback2 = function(message) {
    hasInvokedCh2++;
    assertObjectEquals(CH1_REQUEST, message);
    if (hasInvokedCh2 !== 3) {
      return CH2_RESPONSE;
    } else {
      throw CH2_ERROR;
    }
  };

  var invocationCallback1 = function(message) {
    hasReturnedFromCh2++;
    assertObjectEquals(CH2_RESPONSE, message);
  };

  var errorCallback1 = function(message) {
    hasReturnedErrorFromCh2++;
    assertObjectEquals(CH2_ERROR, message);
  };

  var invocationCallback2 = function(message) {
    hasReturnedFromCh1++;
    assertObjectEquals(CH1_RESPONSE, message);
  };

  respondingCh1.registerService(SERVICE_NAME, serviceCallback1);
  respondingCh2.registerService(SERVICE_NAME, serviceCallback2);

  respondingCh1.send(
      SERVICE_NAME, CH1_REQUEST, invocationCallback1, errorCallback1);
  ch2.receive('public:' + SERVICE_NAME, message1Ch1Request);
  ch1.receive('private:mics', message1Ch2Response);

  respondingCh1.send(
      SERVICE_NAME, CH1_REQUEST, invocationCallback1, errorCallback1);
  ch2.receive('public:' + SERVICE_NAME, message2Ch1Request);
  ch1.receive('private:mics', message2Ch2Response);

  respondingCh1.send(
      SERVICE_NAME, CH1_REQUEST, invocationCallback1, errorCallback1);
  ch2.receive('public:' + SERVICE_NAME, message3Ch1Request);
  ch1.receive('private:mics', message3Ch2Response);

  respondingCh2.send(SERVICE_NAME, CH2_REQUEST, invocationCallback2);
  ch1.receive('public:' + SERVICE_NAME, message3Ch2Request);
  ch2.receive('private:mics', message3Ch1Response);

  respondingCh2.send(SERVICE_NAME, CH2_REQUEST, invocationCallback2);
  ch1.receive('public:' + SERVICE_NAME, message4Ch2Request);
  ch2.receive('private:mics', message4Ch1Response);

  assertTrue(
      (hasInvokedCh1 === 2) &&
      (hasInvokedCh2 === 3) &&
      (hasReturnedFromCh1 === 2) &&
      (hasReturnedFromCh2 === 2) &&
      (hasReturnedErrorFromCh2 === 1));
}
