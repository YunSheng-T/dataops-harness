// Reference Remote contract only. Verify actual DSH Remote registration and errors.

import type {
  DevDocumentSnapshot,
  AnalysisSnapshot,
  Digest,
  FsVersionToken,
  SubjectKind,
} from './dev-document.types';

export interface SaveReceipt {
  saveId: string;
  documentId: string;
  savedDigest: Digest;
  savedAt: string;
}

export interface SaveResult {
  version: FsVersionToken;
  savedDigest: Digest;
  savedAt: string;
  receipt: SaveReceipt;
}

export type ReconcileResult =
  | { kind: 'saved'; version: FsVersionToken; savedDigest: Digest; receipt?: SaveReceipt }
  | { kind: 'not-saved'; version: FsVersionToken; currentDigest: Digest }
  | { kind: 'conflict'; current: DevDocumentSnapshot };

export interface DevDocumentRemote {
  open(input: { fileAddress: string }): Promise<DevDocumentSnapshot>;

  save(input: {
    documentId: string;
    baseVersion: FsVersionToken;
    text: string;
    idempotencyKey: string;
  }): Promise<SaveResult>;

  analyze(input: {
    documentId: string;
    text: string;
    contentType: string;
    requestId: string;
    subjectKind: SubjectKind;
  }): Promise<AnalysisSnapshot>;

  reconcile(input: {
    documentId: string;
    baseVersion: FsVersionToken;
    targetDigest: Digest;
  }): Promise<ReconcileResult>;

  updatePresence(input: {
    documentId: string;
    state: 'clean' | 'dirty';
    baseDigest: Digest;
    draftDigest: Digest;
    clientInstance: string;
  }): Promise<{ leaseExpiresAt: string }>;

  close(input: { documentId: string; clientInstance: string }): Promise<void>;

  invokeAction(input: {
    actionId: string;
    fileAddress: string;
    savedDigest: Digest;
    workItemId?: string;
    params?: unknown; // validate against the registered action schema
  }): Promise<{ actionId: string; status: string; receipt?: unknown }>;
}
