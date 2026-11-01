// Reference Slot owner props. No Cordis ctx or writable Document Store.

import type {
  ActionAvailability,
  AnalysisSnapshot,
  DevSyncState,
  Digest,
  SourceMapEntry,
  SourceRange,
} from './dev-document.types';
import type { StructuredEditRequest, StructuredEditResult } from './structured-editing.types';

export interface ReadonlyDocumentView {
  fileAddress: string;
  contentType: string;
  subjectKind: 'draft' | 'saved';
  subjectDigest: Digest;
  syncState: DevSyncState;
}

export interface DocumentRendererProps {
  document: Readonly<ReadonlyDocumentView>;
  projection: unknown;
  sourceMap: readonly SourceMapEntry[];
  selection: { entityRef?: string; range?: SourceRange };
  revealRange(range: SourceRange): void;
  selectEntity(entityRef?: string): void;
  requestEdits(request: StructuredEditRequest): Promise<StructuredEditResult>;
}

export interface DocumentActionContext {
  fileAddress: string;
  contentType: string;
  savedDigest: Digest;
  syncState: DevSyncState;
  workItemId?: string;
  allowedActions: readonly ActionAvailability[];
}

export interface ArtifactActionContext extends DocumentActionContext {
  savedArtifactRef?: {
    fileAddress: string;
    savedDigest: Digest;
    contentType: string;
    revision: unknown;
  };
}

export interface DocumentRendererContribution {
  id: string;
  pluginId: string;
  contributionVersion: string;
  contentTypes: string[];
  priority: number;
  canRender(ctx: { contentType: string; projectionKind: string }): boolean;
}

export type DataopsDevSlotName =
  | 'dataops.dev.document.renderer'
  | 'dataops.dev.document.inspector'
  | 'dataops.dev.document.actions'
  | 'dataops.dev.artifact.actions'
  | 'dataops.dev.editor.status';

// Diagnostics come from Host Provider Registry + AnalysisSnapshot, never arbitrary UI Slot injection.
export type DiagnosticsSnapshot = AnalysisSnapshot['diagnostics'];
