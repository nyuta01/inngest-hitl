import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  try {
    const { event, data } = await request.json();

    if (!event || !data) {
      return NextResponse.json(
        { error: "Event and data are required" },
        { status: 400 }
      );
    }

    await inngest.send({
      name: event,
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send feedback:", error);
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
}