export function createDebugLogger(debug) {
  if (!debug) {
    return () => {};
  }

  if (typeof debug === "function") {
    return (event, payload) => {
      debug({ event, ...payload });
    };
  }

  return (event, payload) => {
    console.debug(`[AniWorld] ${event}`, payload);
  };
}
