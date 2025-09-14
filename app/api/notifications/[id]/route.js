import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Notification from "@/app/models/Notification.model";

// DELETE /api/notifications/[id]
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Notification deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
