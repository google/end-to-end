// This file was automatically generated from welcome.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.welcome.
 */

goog.provide('e2e.ext.ui.templates.welcome');
goog.provide('e2e.ext.ui.templates.welcome.Welcome');
goog.provide('e2e.ext.ui.templates.welcome.WelcomeSection');

goog.require('soy');
goog.require('soydata');
goog.require('goog.i18n.bidi');


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.welcome.Welcome = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<html><head><title>' + soy.$$escapeHtmlRcdata(opt_data.extName) + '</title><link rel="stylesheet"/></head><body><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.WELCOME_BODY) + '"><h1>' + soy.$$escapeHtml(opt_data.headerText) + '</h1><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.WELCOME_MENU) + '">' + e2e.ext.ui.templates.welcome.WelcomeSection({sectionText: opt_data.noviceSection, headerId: e2e.ext.constants.ElementId.WELCOME_MENU_NOVICE, contentId: e2e.ext.constants.ElementId.WELCOME_CONTENT_NOVICE}, null, opt_ijData) + e2e.ext.ui.templates.welcome.WelcomeSection({sectionText: opt_data.advancedSection, headerId: e2e.ext.constants.ElementId.WELCOME_MENU_ADVANCED, contentId: e2e.ext.constants.ElementId.WELCOME_CONTENT_ADVANCED}, null, opt_ijData) + e2e.ext.ui.templates.welcome.WelcomeSection({sectionText: opt_data.basicsSection, headerId: e2e.ext.constants.ElementId.WELCOME_MENU_BASICS, contentId: e2e.ext.constants.ElementId.WELCOME_CONTENT_BASICS}, null, opt_ijData) + '</div><div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.PREFERENCE_DIV) + '"><input type="checkbox" action="' + soy.$$escapeHtmlAttribute(soy.$$filterNormalizeUri(e2e.ext.constants.StorageKey.ENABLE_WELCOME_SCREEN)) + '" /><div>' + soy.$$escapeHtml(opt_data.preferenceLabel) + '</div></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.WELCOME_FOOTER) + '"><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.CALLBACK_DIALOG) + '"></div></div></body></html>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.welcome.Welcome.soyTemplateName = 'e2e.ext.ui.templates.welcome.Welcome';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.welcome.WelcomeSection = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<div id="' + soy.$$escapeHtmlAttribute(opt_data.headerId) + '"><fieldset><legend>' + soy.$$escapeHtml(opt_data.sectionText.title) + '</legend><div id="' + soy.$$escapeHtmlAttribute(opt_data.contentId) + '">';
  var subsectionList47 = opt_data.sectionText.subsections;
  var subsectionListLen47 = subsectionList47.length;
  for (var subsectionIndex47 = 0; subsectionIndex47 < subsectionListLen47; subsectionIndex47++) {
    var subsectionData47 = subsectionList47[subsectionIndex47];
    output += (subsectionData47.iframe) ? '<iframe src="' + soy.$$escapeHtmlAttribute(soy.$$filterNormalizeUri(subsectionData47.iframe.src)) + '" width="' + soy.$$escapeHtmlAttribute(subsectionData47.iframe.width) + '" height="' + soy.$$escapeHtmlAttribute(subsectionData47.iframe.height) + '"></iframe>' : '<p ' + ((subsectionData47.header) ? 'class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.WELCOME_SUBSECTION_HEADER) + '"' : '') + '>' + soy.$$escapeHtml(subsectionData47.text) + '</p>';
  }
  output += '</div></fieldset></div>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.welcome.WelcomeSection.soyTemplateName = 'e2e.ext.ui.templates.welcome.WelcomeSection';
}
