/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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

goog.provide('e2e.openpgp.pgpmime.types.Attachment');
goog.provide('e2e.openpgp.pgpmime.types.ContentAndHeaders');
goog.provide('e2e.openpgp.pgpmime.types.Entity');
goog.provide('e2e.openpgp.pgpmime.types.Header');
goog.provide('e2e.openpgp.pgpmime.types.HeaderValueBasic');
goog.provide('e2e.openpgp.pgpmime.types.HeaderValueWithParams');
goog.provide('e2e.openpgp.pgpmime.types.NodeContent');


/**
 * @typedef {{
 * multipart: boolean,
 * optionalHeaders: (Array<!e2e.openpgp.pgpmime.types.Header>|undefined)
 * }}
 */
e2e.openpgp.pgpmime.types.NodeContent;


/**
 * @typedef {{
 * body: string,
 * attachments: (Array.<!e2e.openpgp.pgpmime.types.Attachment>|undefined),
 * subject: (string|undefined),
 * from: (string|undefined),
 * to: (string|undefined),
 * inReplyTo: (string|undefined)
 * }}
 */
e2e.openpgp.pgpmime.types.ContentAndHeaders;


/**
 * @typedef {{filename: string, content: string, encoding: (string|undefined),
 *            type: string}}
 */
e2e.openpgp.pgpmime.types.Attachment;


/**
 * @typedef {Object.<string, (!e2e.openpgp.pgpmime.types.HeaderValueBasic|
 *   !e2e.openpgp.pgpmime.types.HeaderValueWithParams)>}
 */
e2e.openpgp.pgpmime.types.Header;


/**
 * @typedef {{value: string}}
 */
e2e.openpgp.pgpmime.types.HeaderValueBasic;


/**
 * @typedef {{value: string, params: (!Object.<string, string>|undefined)}}
 */
e2e.openpgp.pgpmime.types.HeaderValueWithParams;


/**
 * @typedef {{header: !e2e.openpgp.pgpmime.types.Header,
 *     body: (string|!Array.<e2e.openpgp.pgpmime.types.Entity>)}}
 */
e2e.openpgp.pgpmime.types.Entity;
