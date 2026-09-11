export function createConnectionGuard() {
  let current: { close: () => void } | null = null;
  let generation = 0;
  return {
    begin() {
      generation += 1;
      try {
        current?.close();
      } catch {
        /* ignore */
      }
      current = null;
      return generation;
    },
    attach(gen: number, ws: { close: () => void }) {
      if (gen !== generation) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        return false;
      }
      current = ws;
      return true;
    },
    isCurrent(gen: number) {
      return gen === generation;
    },
    close() {
      generation += 1;
      try {
        current?.close();
      } catch {
        /* ignore */
      }
      current = null;
    },
    get socket() {
      return current;
    },
  };
}
