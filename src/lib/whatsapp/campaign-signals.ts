const g = globalThis as unknown as {
  waCancelSet: Set<string>;
  waSkipMap: Map<string, Set<string>>;
};

g.waCancelSet = g.waCancelSet ?? new Set();
g.waSkipMap = g.waSkipMap ?? new Map();

export function cancelCampaign(id: string) {
  g.waCancelSet.add(id);
}

export function skipContact(campaignId: string, contactId: string) {
  if (!g.waSkipMap.has(campaignId)) g.waSkipMap.set(campaignId, new Set());
  g.waSkipMap.get(campaignId)!.add(contactId);
}

export function shouldCancel(id: string): boolean {
  return g.waCancelSet.has(id);
}

export function shouldSkipContact(campaignId: string, contactId: string): boolean {
  const set = g.waSkipMap.get(campaignId);
  if (set?.has(contactId)) {
    set.delete(contactId);
    return true;
  }
  return false;
}

export function clearSignals(id: string) {
  g.waCancelSet.delete(id);
  g.waSkipMap.delete(id);
}
