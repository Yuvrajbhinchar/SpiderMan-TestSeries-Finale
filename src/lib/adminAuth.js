import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/turso";

export async function getAdminFromRequest(request) {
  const authHeader =
    request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    const error = new Error("Unauthorized.");
    error.status = 401;
    throw error;
  }

  const token = authHeader.slice(7);

  let decoded;

  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    const error = new Error("Unauthorized.");
    error.status = 401;
    throw error;
  }

  const result = await db.execute({
    sql: `
      SELECT
        id,
        firebase_uid,
        email,
        display_name,
        photo_url,
        role
      FROM users
      WHERE firebase_uid = ?
      LIMIT 1
    `,
    args: [decoded.uid],
  });

  if (!result.rows.length) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  const user = result.rows[0];

  if (user.role !== "admin") {
    const error = new Error(
      "You do not have admin access."
    );
    error.status = 403;
    throw error;
  }

  return user;
}

export function adminErrorResponse(error) {
  const status =
    Number(error?.status) || 500;

  return Response.json(
    {
      error:
        error?.message ||
        "Something went wrong.",
    },
    {
      status,
    }
  );
}