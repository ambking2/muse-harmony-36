/**
 * Module-level opener registry.
 *
 * The top bar and the Now Playing screen both need to open dialogs that are
 * mounted elsewhere (in the shell). A tiny registry keeps that to one hook
 * each instead of threading props through every route, and lives in its own
 * module so AppShell and the sheets don't import each other.
 */

type Opener = { open: () => void };

function createRegistry() {
  const openers = new Set<Opener>();
  return {
    register(o: Opener) {
      openers.add(o);
      return () => {
        openers.delete(o);
      };
    },
    openAll() {
      openers.forEach((o) => o.open());
    },
  };
}

export const paletteRegistry = createRegistry();
export const queueRegistry = createRegistry();
