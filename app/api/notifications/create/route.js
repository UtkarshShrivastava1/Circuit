import dbConnect from "@/lib/mongodb";
import Notification from "@/app/models/Notification";

export async function POST(req) {
  await dbConnect();

  try {
    // ✅ Extract sender info from middleware headers
    const fromEmail = req.headers.get("x-user-email") || process.env.ADMIN_EMAIL;
    const userRole = req.headers.get("x-user-role");

    if (!fromEmail) {
      return new Response(
        JSON.stringify({ error: "You must be logged in" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ✅ Extract body
    const body = await req.json();
    const { msgcontent, source, dataTo, toEmail, date } = body;

    // ✅ Build Notification object matching schema
    const notification = new Notification({
      fromEmail,
      msg: {
        msgcontent,
        source: source || "No Files", // default if not provided
      },
      dataTo, // must be "public" or "private"
      toEmail: Array.isArray(toEmail)
        ? toEmail.map((email) => ({
            email,
            state: "unread", // default for new recipients
          }))
        : [],
      date: date ? new Date(date) : new Date(), // fallback to now
    });

    // ✅ Save to DB
    await notification.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        notification,
        role: userRole,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
