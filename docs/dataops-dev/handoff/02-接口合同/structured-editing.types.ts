// Reference contract for source-preserving structured edits.

import type { Digest, SourceRange } from './dev-document.types';

export interface TextEdit {
  range: SourceRange;
  expectedText: string;
  replacement: string;
}

export interface StructuredEditRequest {
  documentId: string;
  expectedDraftDigest: Digest;
  operation: {
    kind: 'setScalar';
    yamlPath: string;
    value: string | number | boolean | null;
  };
}

export interface StructuredEditResult {
  edits: TextEdit[];
  resultingDraftDigest: Digest;
  analysisRequestId?: string;
}

export interface FixDiagnosticContext {
  fileAddress: string;
  diagnosticId: string;
  providerId: string;
  range?: SourceRange;
  subjectKind: 'draft' | 'saved';
  subjectDigest: Digest;
}

export interface DevLocationV1 {
  v: 1;
  fileAddress: string;
  line?: number;
  column?: number;
  entityRef?: string;
  source?: 'files' | 'diff' | 'diagnostic' | 'artifact' | 'agent';
}
