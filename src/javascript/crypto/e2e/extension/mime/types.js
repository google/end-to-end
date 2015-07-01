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
 * @fileoverview Type definitions for MIME modules
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.ext.mime.types.Attachment');
goog.provide('e2e.ext.mime.types.Entity');
goog.provide('e2e.ext.mime.types.Header');
goog.provide('e2e.ext.mime.types.HeaderValue');
goog.provide('e2e.ext.mime.types.MailContent');


/**
 * @typedef {{body: (string|undefined),
 *     attachments: (Array.<!e2e.ext.mime.Attachment>|undefined)}}
 */
e2e.ext.mime.types.MailContent;


/**
 * @typedef {{filename: string,
 *     content: !Uint8Array}}
 */
e2e.ext.mime.types.Attachment;


/**
 * @typedef {Object.<string, e2e.ext.mime.types.HeaderValue>}
 */
e2e.ext.mime.types.Header;


/**
 * @typedef {{value: string, params: (!Object.<string, string>|undefined)}}
 */
e2e.ext.mime.types.HeaderValue;


/**
 * @typedef {{header: !e2e.ext.mime.types.Header,
 *     body: (string|!Array.<e2e.ext.mime.types.Entity>)}}
 */
e2e.ext.mime.types.Entity;
