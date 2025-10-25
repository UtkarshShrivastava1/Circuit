// app/(routes)/attendance/route.js  (or wherever your route lives)
import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { cookies as nextCookies } from "next/headers";
import { NextResponse } from "next/server";

function toISODateString(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Build an inclusive start/end date range from either:
 *  - days=n   (last n days, ending today)
 *  - startDate & endDate (ISO strings)
 */
function getDateRange(searchParams) {
  const days = searchParams.get("days");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (startDate && endDate) {
    // Parse as UTC dates to avoid timezone issues
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    return { start, end };
  }

  const n = Number(days) || 30;
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (n - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

export async function GET(req) {
  try {
    await dbConnect();

    // --- auth: accept Authorization header OR token cookie ---
    let token = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      // read cookie token (server runtime)
      try {
        const ck = nextCookies().get("token");
        if (ck) token = ck.value;
      } catch (e) {
        // nextCookies available only in certain contexts; ignore if not
      }
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get current user (to enforce member restrictions)
    const currentUser = await User.findById(decoded.id).select("_id role");
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse filters and build mongo filters
    const { searchParams } = new URL(req.url);
    const { start, end } = getDateRange(searchParams);
    const userIdParam = searchParams.get("userId");
    const status = searchParams.get("status"); // approvalStatus filter optional
    const fillMissing = searchParams.get("fillMissing") === "1"; // optional: return continuous days

    const filters = {
      date: { $gte: start, $lte: end },
    };

    if (userIdParam) {
      filters.userId = userIdParam;
    } else if (currentUser.role === "member") {
      filters.userId = currentUser._id;
    }
    if (status) {
      filters.approvalStatus = status;
    }

    // Fetch attendance documents (sorted ascending date so chart flows left->right)
    const docs = await Attendance.find(filters)
      .sort({ date: 1 })
      .select("date status workMode");

    // Map documents into a date-keyed map for easy lookup
    const map = {};
    docs.forEach((d) => {
      const iso = toISODateString(d.date);
      // Derive numeric flags:
      // present = status === 'present' ? 1 : 0
      // office/wfh based on workMode (if present only)
      const present = d.status === "present" ? 1 : 0;
      const wfh = present && d.workMode === "wfh" ? 1 : 0;
      const office = present && d.workMode === "office" ? 1 : 0;
      map[iso] = { date: iso, present, wfh, office };
    });

    // Build the result array
    const result = [];

    if (fillMissing) {
      // create continuous date range array from start -> end
      const cur = new Date(start);
      while (cur <= end) {
        const iso = toISODateString(cur);
        if (map[iso]) {
          result.push(map[iso]);
        } else {
          result.push({ date: iso, present: 0, wfh: 0, office: 0 });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Only return days that exist in DB (sorted)
      Object.keys(map)
        .sort()
        .forEach((k) => result.push(map[k]));
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("Attendance Report error:", err);
    return NextResponse.json(
      { message: err.message || "Server error" },
      { status: 500 }
    );
  }
}
