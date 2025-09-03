import { verifyToken } from "@/lib/auth";

export async function authenticate(req) {
  try {
    const authHeader = req.headers.get("authorization");
    // console.log("Authnetic : " , authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null; // ❌ unauthorized
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    return decoded; // ✅ return user object (e.g., { id, role })
  } catch (err) {
    console.error("Auth error:", err.message);
    return null; // ❌ invalid/expired
  }
}
