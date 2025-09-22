const clients = new Map(); // { userId: Set<sendFn> }

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return new Response("Missing userId", { status: 400 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(sendEvent);

      const interval = setInterval(() => sendEvent({ type: "ping" }), 20000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clients.get(userId)?.delete(sendEvent);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// 🔹 Send notification to 1 user
export function sendNotification(userId, payload) {
  const targets = clients.get(userId);
  if (!targets) return;
  for (const send of targets) {
    send({ type: "notification", ...payload });
  }
}
