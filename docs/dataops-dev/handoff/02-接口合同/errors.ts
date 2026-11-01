// Stable reference error codes. Map to the actual DSH RemoteError system.

export const DEV_ERROR_CODES = [
  'dev/not-found',
  'dev/not-regular-file',
  'dev/too-large',
  'dev/unsupported-encoding',
  'dev/concurrent-read',
  'dev/stale-version',
  'dev/save-unknown',
  'dev/idempotency-conflict',
  'dev/document-dirty',
  'dev/stale-draft',
  'dev/stale-analysis',
  'dev/unsaved-changes',
  'dev/action-forbidden',
  'dev/provider-unavailable',
] as const;

export type DevErrorCode = typeof DEV_ERROR_CODES[number];

// Expected handling:
// stale-version -> conflict, preserve local
// save-unknown -> reconcile, never blind retry
// document-dirty -> Agent proposal only, disk unchanged
// stale-draft/stale-analysis -> discard or regenerate, never apply old ranges
// unsaved-changes/action-forbidden -> Host rejects even if Client is manipulated
