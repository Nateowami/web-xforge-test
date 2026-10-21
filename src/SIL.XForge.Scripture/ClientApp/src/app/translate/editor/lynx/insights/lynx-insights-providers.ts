import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { DocumentManager, DocumentReader } from '@sillsdev/lynx';
import { ScriptureDeltaDocument } from '@sillsdev/lynx-delta';
import Delta, { Op } from 'quill-delta';
import { QuillFormatRegistryService } from '../../../../shared/text/quill-editor-registration/quill-format-registry.service';
import { EditorReadyService } from './base-services/editor-ready.service';
import { EditorSegmentService } from './base-services/editor-segment.service';
import { InsightRenderService } from './base-services/insight-render.service';
import { LynxWorkspaceService, TextDocReader } from './lynx-workspace.service';
import { lynxInsightBlots } from './quill-services/blots/lynx-insight-blot';
import { QuillEditorReadyService } from './quill-services/quill-editor-ready.service';
import { QuillEditorSegmentService } from './quill-services/quill-editor-segment.service';
import { QuillInsightRenderService } from './quill-services/quill-insight-render.service';
import { TextDocDocumentFactory } from './text-doc-document-factory';

/**
 * Lynx Insights services' providers and initialization.
 */
export function provideLynxInsights(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: DocumentManager,
      useFactory: createLynxDocumentManager,
      deps: [TextDocReader]
    },
    provideAppInitializer(() => {
      const lynxWorkspaceService = inject(LynxWorkspaceService);
      return lynxWorkspaceService.init();
    }),
    provideAppInitializer(() => {
      const formatRegistry = inject(QuillFormatRegistryService);
      formatRegistry.registerFormats(lynxInsightBlots);
    }),
    { provide: EditorReadyService, useClass: QuillEditorReadyService },
    { provide: InsightRenderService, useClass: QuillInsightRenderService },
    { provide: EditorSegmentService, useClass: QuillEditorSegmentService }
  ]);
}

function createLynxDocumentManager(
  documentReader: DocumentReader<Delta>
): DocumentManager<ScriptureDeltaDocument, Op, Delta> {
  const documentFactory = new TextDocDocumentFactory();
  return new DocumentManager<ScriptureDeltaDocument, Op, Delta>(documentFactory, documentReader);
}
