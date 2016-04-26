/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Provides constants used throughout the End-To-End extension.
 */

goog.provide('e2e.ext.constants');
goog.provide('e2e.ext.constants.Actions');
goog.provide('e2e.ext.constants.BackupCode');
goog.provide('e2e.ext.constants.CssClass');
goog.provide('e2e.ext.constants.ElementId');
goog.provide('e2e.ext.constants.StorageKey');


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
  GET_KEY_DESCRIPTION: 'get_key_description',
  GET_PASSPHRASE: 'get_passphrase',
  GET_KEYRING_BACKUP_DATA: 'get_keyring_backup_data',
  RESTORE_KEYRING_DATA: 'restore_keyring_data',
  IMPORT_KEY: 'import_key',
  LIST_KEYS: 'list_keys',

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
  BODY: 'pgpBody',
  MAIN_FORM: 'pgpMain',
  KEY_SELECT_FORM: 'pgpKeySelect',
  GENERATE_KEY_FORM: 'pgpGenerateKey',
  PREFERENCES: 'pgpPreferences',
  SIGN_MESSAGE_CHECK: 'pgpSignMessage',
  SIGNER_SELECT: 'pgpSignerSelect',
  KEYRING_DIV: 'storedKeys',
  SIGNUP_PROMPT: 'signupPrompt',
  KEYRING_IMPORT_DIV: 'keyringImportDiv',
  KEYRING_OPTIONS_DIV: 'keyringOptionsDiv',
  KEYRING_PASSPHRASE_CHANGE_DIV: 'keyringPassphraseChangeDiv',
  KEYRING_PASSPHRASE_CONFIRM_DIV: 'keyringPassphraseConfirmDiv',
  ERROR_DIV: 'errorDiv',
  CALLBACK_DIALOG: 'callbackDialog',
  CHIP_HOLDER: 'chipHolder',
  FROM_HOLDER: 'fromHolder',
  SUBJECT_HOLDER: 'subjectHolder',
  SUBJECT: 'subject',

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
  NOTIFICATION_SUCCESS: 'e2e-success',

  // Website container
  WEBVIEW: 'webview',
  PROMPT: 'prompt'
};


/**
 * The CSS classes used throughout the extension.
 * @enum {string}
 */
e2e.ext.constants.CssClass = {
  ACTION: 'action',
  CANCEL: 'cancel',
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
  SELECT_ALL_LINK: 'select-all-link',

  /* Used in the generate PGP keys form. */
  EMAIL: 'email',
  PASSPHRASE: 'passphrase',
  PASSPHRASE_CONFIRM: 'passphrase-confirm',

  /* Used in the keyring management section. */
  EXPORT: 'export',
  REMOVE: 'remove',
  KEY_INFO: 'key-info',
  KEY_FINGERPRINT: 'key-fingerprint',
  KEY_META: 'key-meta',
  KEY_TYPE_DESC: 'key-type-description',
  KEY_UID: 'key-uid',
  KEY_SUBKEY: 'key-sub',
  SIGNUP_PROMPT: 'keyring-signup',
  KEYRING_IMPORT: 'keyring-import',
  KEYRING_EXPORT: 'keyring-export',
  KEYRING_BACKUP: 'keyring-backup',
  KEYRING_BACKUP_WINDOW: 'keyring-backup-window',
  KEYRING_RESTORE: 'keyring-restore',
  KEYRING_RESTORE_INPUT: 'keyring-restore-input',
  /* TODO(rcc): Remove when we can use keyserver for lookups. */
  KEYRING_RESTORE_EMAIL: 'keyring-restore-email',
  KEYRING_PASSPHRASE_CHANGE: 'keyring-passphrase-change',

  /** Used in the welcome page. */
  WELCOME_MENU_ICON: 'welcome-menu-icon',
  WELCOME_SUBSECTION_HEADER: 'welcome-subsection-header',

  /** Used in prompt. */
  PROMPT_HEADER: 'pgpHead',
  PROMPT_TITLE: 'pgpTitle',
  PROMPT_ACTIONS: 'pgpActions',
  BUTTONS_CONTAINER: 'buttons-container',
  MENU_BUTTON: 'menu-button',
  POPOUT_BUTTON: 'popout-button',
  PASSPHRASE_ENCRYPTION_LINK: 'passphraseEncryptionLink'
};


/**
 * The keys used to persist data into storage.
 * @enum {string}
 */
e2e.ext.constants.StorageKey = {
  ENABLE_WELCOME_SCREEN: 'enable-welcome',
  ENABLE_ACTION_SNIFFING: 'enable-action-sniff',
  ENABLE_LOOKING_GLASS: 'enable-looking-glass-feature',
  PREFERENCES: 'PREF'
};


/**
 * The number of millis to keep Chrome notifications visible.
 * @const
 */
e2e.ext.constants.NOTIFICATIONS_DELAY = 10 * 1000;


/**
 * Regular expression matching a valid email address. This needs to be very
 *    strict and reject uncommon formats to prevent vulnerability when
 *    keyserver would choose a different key than intended.
 * @const
 */
e2e.ext.constants.EMAIL_ADDRESS_REGEXP =
    /^[+a-zA-Z0-9_.!-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;


/**
 * Default options for e2e
 * @type {{keyAlgo: string, keyLength: number,
 *     subkeyAlgo: string, subkeyLength: number}}
 */
e2e.ext.constants.KEY_DEFAULTS = {
  keyAlgo: 'ECDSA',
  keyLength: 256,

  subkeyAlgo: 'ECDH',
  subkeyLength: 256
};


/**
 * The dimensions for displaying the keyring backup code.
 * @enum {number}
 */
e2e.ext.constants.BackupCode = {
  ROWS: 3,
  COLS: 4
};


/**
 * The length of backup codes.
 * @const
 */
e2e.ext.constants.BACKUP_CODE_LENGTH = 24;
