'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.QuoteFormat = exports.ParagraphBreakFormat = exports.TranslateShareLevel = exports.ProjectType = void 0;
var ProjectType;
(function (ProjectType) {
  ProjectType['Standard'] = 'Standard';
  ProjectType['Resource'] = 'Resource';
  ProjectType['BackTranslation'] = 'BackTranslation';
  ProjectType['Daughter'] = 'Daughter';
  ProjectType['Transliteration'] = 'Transliteration';
  ProjectType['TransliterationManual'] = 'TransliterationManual';
  ProjectType['TransliterationWithEncoder'] = 'TransliterationWithEncoder';
  ProjectType['StudyBible'] = 'StudyBible';
  ProjectType['ConsultantNotes'] = 'ConsultantNotes';
  ProjectType['GlobalConsultantNotes'] = 'GlobalConsultantNotes';
  ProjectType['GlobalAnthropologyNotes'] = 'GlobalAnthropologyNotes';
  ProjectType['StudyBibleAdditions'] = 'StudyBibleAdditions';
  ProjectType['Auxiliary'] = 'Auxiliary';
  ProjectType['AuxiliaryResource'] = 'AuxiliaryResource';
  ProjectType['MarbleResource'] = 'MarbleResource';
  ProjectType['Xml'] = 'Xml';
  ProjectType['XmlResource'] = 'XmlResource';
  ProjectType['XmlDictionary'] = 'XmlDictionary';
  ProjectType['SourceLanguage'] = 'SourceLanguage';
  ProjectType['Dictionary'] = 'Dictionary';
  ProjectType['EnhancedResource'] = 'EnhancedResource';
})(ProjectType || (exports.ProjectType = ProjectType = {}));
var TranslateShareLevel;
(function (TranslateShareLevel) {
  TranslateShareLevel['Anyone'] = 'anyone';
  TranslateShareLevel['Specific'] = 'specific';
})(TranslateShareLevel || (exports.TranslateShareLevel = TranslateShareLevel = {}));
var ParagraphBreakFormat;
(function (ParagraphBreakFormat) {
  ParagraphBreakFormat['BestGuess'] = 'best_guess';
  ParagraphBreakFormat['Remove'] = 'remove';
  ParagraphBreakFormat['MoveToEnd'] = 'move_to_end';
})(ParagraphBreakFormat || (exports.ParagraphBreakFormat = ParagraphBreakFormat = {}));
var QuoteFormat;
(function (QuoteFormat) {
  QuoteFormat['Denormalized'] = 'denormalized';
  QuoteFormat['Normalized'] = 'normalized';
})(QuoteFormat || (exports.QuoteFormat = QuoteFormat = {}));
//# sourceMappingURL=translate-config.js.map
