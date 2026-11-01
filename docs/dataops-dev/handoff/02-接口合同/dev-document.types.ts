// Reference contract only. Adapt to the verified local DSH APIs.

export type FsVersionToken = string; // opaque; never parse or manufacture in Client
export type Digest = string;         // e.g. sha256:...
export type SubjectKind = 'draft' | 'saved';

export interface SourceRange {
  startLine: number;    // 1-based
  startColumn: number;  // 1-based UTF-16 code units
  endLine: number;
  endColumn: number;    // exclusive
}

export interface ActionAvailability {
  actionId: string;
  allowed: boolean;
  reasonCode?: string;
}

export interface DevDocumentSnapshot {
  documentId: string;
  fileAddress: string;
  text: string;
  baseVersion: FsVersionToken;
  savedDigest: Digest;
  contentType: string;
  readOnly: boolean;
  capabilities: {
    canAnalyze: boolean;
    canStructuredEdit: boolean;
    allowedActions: ActionAvailability[];
  };
}

export interface TextSnapshot {
  text: string;
  digest: Digest;
  version?: FsVersionToken;
  origin: 'base' | 'local' | 'current';
}

export type DevSyncState =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'external-clean'
  | 'conflict'
  | 'save-unknown';

export interface DevDocumentModel {
  documentId: string;
  fileAddress: string;
  baseText: string;
  baseVersion: FsVersionToken;
  savedDigest: Digest;
  draftText: string;
  draftDigest: Digest;
  documentRevision: number; // Client rendering only
  sync: DevSyncState;
  access: 'writable' | 'read-only';
  availability: 'ready' | 'missing' | 'too-large' | 'unsupported';
  analysis?: AnalysisSnapshot;
  conflict?: {
    base: TextSnapshot;
    local: TextSnapshot;
    current: TextSnapshot;
  };
}

export interface AnalysisSnapshot {
  analysisId: string;
  subjectKind: SubjectKind;
  subjectDigest: Digest;
  projection?: unknown;
  diagnostics: Diagnostic[];
  sourceMap: SourceMapEntry[];
  providerSet: ProviderVersion[];
}

export interface SourceMapEntry {
  entityRef: string;
  yamlPath: string;
  range: SourceRange;
}

export interface ProviderVersion {
  providerId: string;
  providerVersion: string;
}

export interface Diagnostic {
  id: string;
  fingerprint?: string;
  providerId: string;
  providerVersion: string;
  source: 'parser' | 'scanner' | 'verification' | 'artifact';
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  fileAddress: string;
  range?: SourceRange;
  entityRef?: string;
  subjectKind: SubjectKind;
  subjectDigest: Digest;
  analysisId: string;
  state: 'active' | 'stale' | 'resolved';
}

export interface ProposalHunk {
  range: SourceRange;
  expectedText: string;
  replacement: string;
}

export interface EditProposal {
  proposalId: string;
  fileAddress: string;
  origin: { actor: 'agent'; runId?: string; summary: string };
  subjectKind: SubjectKind;
  subjectDigest: Digest;
  baseVersion?: FsVersionToken;
  hunks: ProposalHunk[];
  createdAt: string;
  state: 'offered' | 'applied' | 'dismissed' | 'stale';
}

export interface HotExitRecord {
  sessionScope: string;
  fileAddress: string;
  baseVersion: FsVersionToken;
  baseDigest: Digest;
  draftText: string;
  draftDigest: Digest;
  updatedAt: string;
  clientInstance: string;
}
