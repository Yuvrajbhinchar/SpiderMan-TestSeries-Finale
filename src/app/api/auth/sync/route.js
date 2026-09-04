import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { db } from "@/lib/turso";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const idToken = authorization.split("Bearer ")[1];

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email ?? null;
    const displayName = decodedToken.name ?? null;
    const photoUrl = decodedToken.picture ?? null;

    const provider =
      decodedToken.firebase?.sign_in_provider ?? null;

    const existingUser = await db.execute({
      sql: `
        SELECT id
        FROM users
        WHERE firebase_uid = ?
        LIMIT 1
      `,
      args: [firebaseUid],
    });

    if (existingUser.rows.length === 0) {
      await db.execute({
        sql: `
          INSERT INTO users (
            firebase_uid,
            email,
            display_name,
            photo_url,
            provider
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          firebaseUid,
          email,
          displayName,
          photoUrl,
          provider,
        ],
      });
    } else {
      await db.execute({
        sql: `
          UPDATE users
          SET
            email = ?,
            display_name = ?,
            photo_url = ?,
            provider = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE firebase_uid = ?
        `,
        args: [
          email,
          displayName,
          photoUrl,
          provider,
          firebaseUid,
        ],
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        firebaseUid,
        email,
        displayName,
        photoUrl,
        provider,
      },
    });
  } catch (error) {
    console.error("User sync error:", error);

    return NextResponse.json(
      { error: "Unable to sync user" },
      { status: 500 }
    );
  }
}