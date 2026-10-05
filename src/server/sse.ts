import type { Response } from "express";

type SseClient = {
  id: string;
  res: Response;
};

const clients: SseClient[] = [];

export function registerSseClient(id: string, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(
    `data: ${JSON.stringify({ type: "connected", clientId: id, timestamp: new Date().toISOString() })}\n\n`,
  );

  const client: SseClient = { id, res };
  clients.push(client);

  res.on("close", () => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
  });
}

export function broadcastRealtimeEvent(event: string, payload: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(message);
    } catch (err) {
      console.warn("Failed to write to SSE client:", client.id, err);
    }
  }
}

// Keep-alive ping interval
setInterval(() => {
  for (const client of clients) {
    try {
      client.res.write(": ping\n\n");
    } catch {
      // ignore
    }
  }
}, 25000);
