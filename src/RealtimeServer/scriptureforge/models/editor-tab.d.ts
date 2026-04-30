export declare const editorTabTypes: readonly [
  'biblical-terms',
  'history',
  'draft',
  'project-source',
  'project-target',
  'project-resource'
];
type EditorTabTypes = typeof editorTabTypes;
export type EditorTabType = EditorTabTypes[number];
export type EditorTabGroupType = 'source' | 'target';
export {};
