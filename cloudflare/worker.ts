export interface Env {
  ASSETS: Fetcher;
  BACKEND_ORIGIN: string;
}

function backendRequest(request: Request, origin: string) {
  const target = new URL(request.url);
  const backend = new URL(origin);
  target.protocol = backend.protocol;
  target.hostname = backend.hostname;
  target.port = backend.port;
  return new Request(target, request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.BACKEND_ORIGIN) return new Response("BACKEND_ORIGIN is not configured", { status: 503 });
      return fetch(backendRequest(request, env.BACKEND_ORIGIN));
    }
    return env.ASSETS.fetch(request);
  },
};
