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
 * @fileoverview Provides constants used throughout E2EMail.
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.openpgp.pgpmime.Constants');


/**
 * MIME string constants
 * @enum {string}
 */
e2e.openpgp.pgpmime.Constants.Mime = {
  // Separators
  CRLF: '\r\n',
  WHITESPACE: ' ',

  // Header names
  CONTENT_TYPE: 'Content-Type',
  CONTENT_TRANSFER_ENCODING: 'Content-Transfer-Encoding',
  MIME_VERSION: 'Mime-Version',
  CONTENT_DISPOSITION: 'Content-Disposition',
  CONTENT_DESCRIPTION: 'Content-Description',
  SUBJECT: 'Subject',
  TO: 'To',
  FROM: 'From',
  IN_REPLY_TO: 'In-Reply-To',

  // OpenPGP version content field. Required by RFC 3156.
  VERSION_CONTENT: 'Version: 1',

  // General Content Types. Case-insensitive.
  PLAINTEXT: 'text/plain',
  MULTIPART_ENCRYPTED: 'multipart/encrypted',
  ENCRYPTED: 'application/pgp-encrypted',
  ENCRYPTED_WITH_NAME: 'application/pgp-encrypted; name="version.asc"',
  OCTET_STREAM: 'application/octet-stream',
  MULTIPART_MIXED: 'multipart/mixed',
  DEFAULT_ENCRYPTED_CONTENT_TYPE:
      'multipart/encrypted; protocol="application/pgp-encrypted"',
  NAME: 'name',

  // Image specific Content Types. Case-insensitive. The list comes from:
  // http://www.iana.org/assignments/media-types/media-types.xhtml#image
  IMAGE_GIF: 'image/gif',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_JPG: 'image/jpg',
  IMAGE_PNG: 'image/png',
  IMAGE_BMP: 'image/bmp',
  IMAGE_WEBP: 'image/webp',
  IMAGE_PJPEG: 'image/pjpeg',
  IMAGE_TIFF: 'image/tiff',
  IMAGE_SVG_XML: 'image/svg+xml',
  IMAGE_VND_DJVU: 'image/vnd.djvu',
  IMAGE_CGM: 'image/cgm',
  IMAGE_EXAMPLE: 'image/example',
  IMAGE_FITS: 'image/fits',
  IMAGE_G3FAX: 'image/g3fax',
  IMAGE_JP2: 'image/jp2',
  IMAGE_IEF: 'image/ief',
  IMAGE_JPM: 'image/jpm',
  IMAGE_JPX: 'image/jpx',
  IMAGE_KTX: 'image/ktx',
  IMAGE_NAPLPS: 'image/naplps',
  IMAGE_PRS_BTIF: 'image/prs.btif',
  IMAGE_PRS_PTI: 'image/prs.pti',
  IMAGE_PWG_RASTER: 'image/pwg-raster',
  IMAGE_T38: 'image/t38',
  IMAGE_TIFF_FX: 'image/tiff-fx',
  IMAGE_VND_ADOBE: 'image/vnd.adobe.photoshop',
  IMAGE_VND_AIRZIP: 'image/vnd.airzip.accelerator.azv',
  IMAGE_VND_CNS: 'image/vnd.cns.inf2',
  IMAGE_VND_DECE: 'image/vnd.dece.graphic',
  IMAGE_VND_DWG: 'image/vnd.dwg',
  IMAGE_VND_DXF: 'image/vnd.dxf',
  IMAGE_VND_DVB: 'image/vnd.dvb.subtitle',
  IMAGE_VND_FASTBIDSHEET: 'image/vnd.fastbidsheet',
  IMAGE_VND_FPX: 'image/vnd.fpx',
  IMAGE_VND_FST: 'image/vnd.fst',
  IMAGE_VND_FUJIXEROX_MMR: 'image/vnd.fujixerox.edmics-mmr',
  IMAGE_VND_FUJIXEROX_RLC: 'image/vnd.fujixerox.edmics-rlc',
  IMAGE_VND_GLOBALGRAPHICS: 'image/vnd.globalgraphics.pgb',
  IMAGE_VND_MICROSOFT: 'image/vnd.microsoft.icon',
  IMAGE_VND_MIX: 'image/vnd.mix',
  IMAGE_VND_MS: 'image/vnd.ms-modi',
  IMAGE_VND_NET: 'image/vnd.net-fpx',
  IMAGE_VND_RADIANCE: 'image/vnd.radiance',
  IMAGE_VND_SEALED_PNG: 'image/vnd.sealed-png',
  IMAGE_VND_SEALEDMEDIA_GIF: 'image/vnd.sealedmedia.softseal-gif',
  IMAGE_VND_SEALEDMEDIA_JPG: 'image/vnd.sealedmedia.softseal-jpg',
  IMAGE_VND_SVF: 'image/vnd-svf',
  IMAGE_VND_TENCENT: 'image/vnd.tencent.tap',
  IMAGE_VND_VALVE: 'image/vnd.valve.source.texture',
  IMAGE_VND_WAP: 'image/vnd-wap-wbmp',
  IMAGE_VND_XIFF: 'image/vnd.xiff',
  IMAGE_VND_ZBRUSH: 'image/vnd.zbrush.pcx',


  // Content Transfer Encodings
  SEVEN_BIT: '7bit',
  QUOTED_PRINTABLE: 'quoted_printable',
  BASE64: 'base64',
  EIGHT_BIT: '8bit',
  BINARY: 'binary',

  // Content dispositions
  ATTACHMENT: 'attachment',
  INLINE: 'inline',

  // Charset. Case-insensitive.
  UTF8: 'utf-8',
  ASCII: 'us-ascii',

  //Miscellanous values
  MIME_VERSION_NUMBER: '1.0',
  PGP_MIME_DESCRIPTION: 'PGP/MIME Versions Identification',
  ENCRYPTED_ASC: 'encrypted.asc',
  VERSION_ASC: 'version.asc'
};


/**
 * MIME number constants
 * @enum {number}
 */
e2e.openpgp.pgpmime.Constants.MimeNum = {
  LINE_WRAP: 64
};


/**
 * MIME array constants
 * @enum {Array}
 */
e2e.openpgp.pgpmime.Constants.MimeArray = {
  IMAGE_TYPES: [e2e.openpgp.pgpmime.Constants.Mime.IMAGE_GIF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JPEG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JPG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_PNG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_BMP,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_WEBP,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_PJPEG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_TIFF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_SVG_XML,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_DJVU,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_CGM,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_EXAMPLE,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_FITS,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_G3FAX,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JP2,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_IEF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JPM,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_JPX,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_KTX,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_NAPLPS,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_PRS_BTIF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_PRS_PTI,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_PWG_RASTER,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_T38,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_TIFF_FX,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_ADOBE,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_AIRZIP,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_CNS,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_DECE,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_DWG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_DXF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_DVB,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_FASTBIDSHEET,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_FPX,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_FST,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_FUJIXEROX_MMR,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_FUJIXEROX_RLC,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_GLOBALGRAPHICS,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_MICROSOFT,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_MIX,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_MS,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_NET,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_RADIANCE,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_SEALED_PNG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_SEALEDMEDIA_GIF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_SEALEDMEDIA_JPG,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_SVF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_TENCENT,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_VALVE,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_WAP,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_XIFF,
                e2e.openpgp.pgpmime.Constants.Mime.IMAGE_VND_ZBRUSH,]
};
