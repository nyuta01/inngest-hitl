import { inngest } from "@/inngest/client";
import { subscribe } from "@inngest/realtime";

export async function POST(req: Request) {
  const json = await req.json();
  const { theme } = json;

  await inngest.send({
    name: "research.submit",
    data: {
      theme,
    },
  });

  const stream = await subscribe({
    channel: "research",
    topics: ["log", "waitForEvent"],
  });  

  return new Response(stream.getEncodedStream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}