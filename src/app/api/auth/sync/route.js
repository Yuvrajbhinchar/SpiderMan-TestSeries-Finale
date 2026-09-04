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

    const idToken = authorization.slice(7);

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing ID token" },
        { status: 401 }
      );
    }

    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(
      idToken
    );

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email ?? null;
    const displayName = decodedToken.name ?? null;
    const photoUrl = decodedToken.picture ?? null;

    const provider =
      decodedToken.firebase?.sign_in_provider ?? null;

    // Check existing user
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
      // Create user
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
      // Update existing user
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

    // Invalid/expired Firebase token
    if (
      error?.code === "auth/argument-error" ||
      error?.code === "auth/id-token-expired" ||
      error?.code === "auth/id-token-revoked"
    ) {
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Unable to sync user." },
      { status: 500 }
    );
  }
}