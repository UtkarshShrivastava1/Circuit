export function checkRole(user, allowedRoles = []) {
  if (!user) {
    return { ok: false, status: 401, message: "Unauthorized: No user found" };
  }

  // If a single role string is passed, convert to array
  if (typeof allowedRoles === "string") {
    allowedRoles = [allowedRoles];
  }

  if (!allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, message: "Forbidden: Insufficient role" };
  }

  return { ok: true };
}
