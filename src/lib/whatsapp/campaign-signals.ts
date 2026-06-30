const g = globalThis as unknown as {
  waCancelSet: Set<string>;
  waSkipSet: Set<string>;
};

g.waCancelSet = g.waCancelSet ?? new Set();
g.waSkipSet = g.waSkipSet ?? new Set();

export function cancelCampaign(id: string) {
  g.waCancelSet.add(id);
}

export function skipNextContact(id: string) {
  g.waSkipSet.add(id);
}

export function shouldCancel(id: string): boolean {
  return g.waCancelSet.has(id);
}

export function shouldSkipAndClear(id: string): boolean {
  if (g.waSkipSet.has(id)) {
    g.waSkipSet.delete(id);
    return true;
  }
  return false;
}

export function clearSignals(id: string) {
  g.waCancelSet.delete(id);
  g.waSkipSet.delete(id);
}
