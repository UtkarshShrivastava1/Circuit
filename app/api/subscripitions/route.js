import dbConnect from "@/lib/mongodb";
import PushSubscription from "@/app/models/PushSubscription";
import { verifyToken } from "@/lib/auth";

export async function POST(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      });
    }

    const body = await req.json();
    const { subscription } = body;

    if (!subscription) {
      return new Response(JSON.stringify({ error: "Subscription required" }), {
        status: 400,
      });
    }

    // Save or update subscription
    await PushSubscription.findOneAndUpdate(
      { userId: decoded.id },
      { userId: decoded.id, subscription },
      { upsert: true, new: true }
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Subscription save error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save subscription" }),
      { status: 500 }
    );
  }
}
