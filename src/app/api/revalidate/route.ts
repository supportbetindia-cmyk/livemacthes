import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { SANITY_TAG } from "@/lib/news";

// Called by a Sanity webhook whenever an article is published, edited or deleted (setup: docs/PUBLISHING.md).
// Marks all Sanity data as expired, so the next visitor gets the new article instead of waiting up to 10 minutes.
// Protected by a shared secret: the webhook sends "Authorization: Bearer <SANITY_REVALIDATE_SECRET>".
export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: "Not configured" }, { status: 404 });

  const sent = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Constant-time compare, so the secret can't be guessed character by character from response times.
  if (sent.length !== expected.length || !timingSafeEqual(sent, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // { expire: 0 }: don't serve the old version to anyone; the next request fetches fresh from Sanity.
  revalidateTag(SANITY_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
