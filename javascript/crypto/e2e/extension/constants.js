// Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Provides constants used throughout the End-To-End extension.
 */

goog.provide('e2e.ext.constants');


/**
 * The actions that the End-To-End extension can perform.
 * @enum {string}
 */
e2e.ext.constants.Actions = {
  // Encryption/signing related actions.
  ENCRYPT_ONLY: 'encrypt_only',
  SIGN_ONLY: 'sign_only',
  ENCRYPT_SIGN: 'encrypt_sign',

  // Decryption/verification related actions.
  DECRYPT_VERIFY: 'decrypt_verify',

  // Keyring management related actions.
  IMPORT_KEY: 'import_key',
  GET_KEY_DESCRIPTION: 'get_key_description',
  GET_PASSPHRASE: 'get_passphrase',

  // Intended no-op. Used for closing the prompt UI when other visual elements
  // (e.g. looking glass) would display data.
  NO_OP: 'no_op',

  // Administration related actions.
  CONFIGURE_EXTENSION: 'configure_extension',

  // Default catch-all action.
  USER_SPECIFIED: 'user_specified'
};


/**
 * The element IDs used throughout the extension.
 * @enum {string}
 */
e2e.ext.constants.ElementId = {
  HEADER: 'pgpHead',
  BODY: 'pgpBody',
  TITLE: 'pgpTitle',
  MAIN_FORM: 'pgpMain',
  KEY_SELECT_FORM: 'pgpKeySelect',
  GENERATE_KEY_FORM: 'pgpGenerateKey',
  PREFERENCES: 'pgpPreferences',
  SIGN_MESSAGE_CHECK: 'pgpSignMessage',
  SIGNER_SELECT: 'pgpSignerSelect',
  KEYRING_DIV: 'storedKeys',
  KEYRING_IMPORT_DIV: 'keyringImportDiv',
  KEYRING_OPTIONS_DIV: 'keyringOptionsDiv',
  KEYRING_PASSPHRASE_CHANGE_DIV: 'keyringPassphraseChangeDiv',
  KEYRING_PASSPHRASE_CONFIRM_DIV: 'keyringPassphraseConfirmDiv',
  ERROR_DIV: 'errorDiv',
  CALLBACK_DIALOG: 'callbackDialog',
  CHIP_HOLDER: 'chipHolder',
  PASSPHRASE_ENCRYPTION_LINK: 'passphraseEncryptionLink',
  FROM_HOLDER: 'fromHolder',

  // Welcome page
  WELCOME_BODY: 'welcome-main',
  WELCOME_MENU: 'welcome-menu',
  WELCOME_MENU_BASICS: 'welcome-menu-basics',
  WELCOME_MENU_NOVICE: 'welcome-menu-novice',
  WELCOME_MENU_ADVANCED: 'welcome-menu-advanced',
  WELCOME_CONTENT_BASICS: 'welcome-content-basics',
  WELCOME_CONTENT_NOVICE: 'welcome-content-novice',
  WELCOME_CONTENT_ADVANCED: 'welcome-content-advanced',
  WELCOME_FOOTER: 'welcome-footer',

  // Chrome notifications
  NOTIFICATION_SUCCESS: 'e2e-success'
};


/**
 * The CSS classes used throughout the extension.
 * @enum {string}
 */
e2e.ext.constants.CssClass = {
  ACTION: 'action',
  CANCEL: 'cancel',
  BACK: 'back',
  SAVE: 'save',
  INSERT: 'insert',
  OPTIONS: 'options',
  HIDDEN: 'hidden',
  INVISIBLE: 'invisible',
  TRANSPARENT: 'transparent',

  /* Used to display UIDs in the prompt. */
  CHIP: 'uid-chip',
  CHIPS: 'uid-chips',
  BAD_CHIP: 'uid-bad-chip',

  /* Common UI components */
  DIALOG_INPUT: 'dialog-input',
  PREFERENCE_DIV: 'preference-div',

  /* Used in the generate PGP keys form. */
  EMAIL: 'email',
  PASSPHRASE: 'passphrase',
  PASSPHRASE_CONFIRM: 'passphrase-confirm',

  /* Used in the keyring management section. */
  EXPORT: 'export',
  REMOVE: 'remove',
  KEY_META: 'key-meta',
  KEY_UID: 'key-uid',
  KEYRING_IMPORT: 'keyring-import',
  KEYRING_EXPORT: 'keyring-export',
  KEYRING_PASSPHRASE_CHANGE: 'keyring-passphrase-change',

  /** Used in the welcome page */
  WELCOME_MENU_ICON: 'welcome-menu-icon',
  WELCOME_SUBSECTION_HEADER: 'welcome-subsection-header'
};


/**
 * The keys used to persist data into local storage.
 * If the key exists in localStorage, then the preference is set, regardless
 * of the value.
 * @enum {string}
 */
e2e.ext.constants.StorageKey = {
  ENABLE_WELCOME_SCREEN: 'enable-welcome',
  ENABLE_ACTION_SNIFFING: 'enable-action-sniff',
  ENABLE_AUTO_SAVE: 'enable-auto-save',
  LAST_SAVED_DRAFT: 'last-saved-draft'
};


/**
 * The number of millis to keep Chrome notifications visible.
 * @type {number}
 */
e2e.ext.constants.NOTIFICATIONS_DELAY = 10 * 1000;


/**
 * The number of millis to wait before saving a draft message.
 * @type {number}
 */
e2e.ext.constants.AUTOSAVE_INTERVAL = 5 * 1000;
