import type { ExecutionContext } from '@cloudflare/workers-types';

// V8 Edge Runtime Code
export interface Env {
  ENVIRONMENT: string;
  AWS_REGION_FALLBACK: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestUrl = new URL(request.url);
    const clientIp = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const userAgent = request.headers.get("user-agent") || "UNKNOWN";

    // 1. Edge Request Health Gateway Routing Pattern
    if (requestUrl.pathname === "/v1/health") {
      return new Response(
        JSON.stringify({
          status: "ONLINE",
          timestamp: new Date().toISOString(),
          edgeLocation: (request as any).cf?.colo || "EDGE-LOCAL",
          environment: env.ENVIRONMENT
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Edge-Distributed-Routing": "True"
          }
        }
      );
    }

    // 2. Telemetry Ingestion Inbound Post Modification Proxy
    if (requestUrl.pathname === "/v1/ingest" && request.method === "POST") {
      try {
        const structuralBody = await request.json();
        
        // Enrich payload elements inside the V8 cache isolation edge directly
        const enrichedPayload = {
          structuralBody,
          ingress_edge_node: (request as any).cf?.colo || "UNKNOWN_NODE",
          client_ip_hashed: btoa(clientIp).slice(0, 12)
        };

        return new Response(
          JSON.stringify({ status: "ACCEPTED", data: enrichedPayload }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: "MALFORMED_JSON_PAYLOAD", systemDiagnostic: err.message }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Default Fallback Route
    return new Response(JSON.stringify({ error: "ROUTE_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
};