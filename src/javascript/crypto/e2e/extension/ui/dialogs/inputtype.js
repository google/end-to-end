/**
 * @fileoverview Lists the supported input types for UI dialogs.
 */

goog.provide('e2e.ext.ui.dialogs.InputType');


/**
 * The type of input the dialog should handle.
 * @enum {string}
 */
e2e.ext.ui.dialogs.InputType = {
  NONE: '',
  TEXT: 'text',
  SECURE_TEXT: 'password'
};
