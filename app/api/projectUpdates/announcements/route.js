import dbConnect from "@/lib/mongodb";
import Announcement from "@/app/models/Announcement";

export const dynamic = 'force-dynamic'; // Mark route as dynamic

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");

    if (!projectName) {
      return new Response(JSON.stringify({ announcement: [] }), { status: 200 });
    }

    const docs = await Announcement.find({ projectName })
      .populate({
        path: "fromUserId",
        select: "email name profileImgUrl",
      })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = docs.map((a) => ({
      ...a,
      fromUser: a.fromUserId
        ? {
            email: a.fromUserId.email,
            name: a.fromUserId.name,
            profileImgUrl: a.fromUserId.profileImgUrl,
          }
        : null,
    }));

    return new Response(JSON.stringify({ announcement: enriched }), { status: 200 });
  } catch (err) {
    console.error("Error fetching announcements:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
