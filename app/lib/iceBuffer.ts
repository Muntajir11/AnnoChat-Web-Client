export function createCandidateBuffer<T>() {
  const pending: T[] = [];
  let remoteReady = false;
  return {
    async markRemoteReady(flush: (c: T) => Promise<void>) {
      remoteReady = true;
      const batch = pending.splice(0);
      for (const c of batch) await flush(c);
    },
    async add(candidate: T, flush: (c: T) => Promise<void>) {
      if (!remoteReady) pending.push(candidate);
      else await flush(candidate);
    },
    get size() {
      return pending.length;
    },
    get ready() {
      return remoteReady;
    },
  };
}
