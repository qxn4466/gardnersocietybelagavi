/**
 * Per-browser (per-tab) identity used for edit leases and preview-number reservations,
 * so two members — even sharing the same login — are treated as different editors.
 */
export const getSessionId = (): string => {
  try {
    let id = sessionStorage.getItem('bgs_session_id');
    if (!id) {
      const c = crypto as { randomUUID?: () => string };
      id = c.randomUUID ? c.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('bgs_session_id', id);
    }
    return id;
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};
