// Firebase Admin credentials for the server and the live worker.
// Hosting panels (Hostinger, Vercel…) can't ship the gitignored service-account file, so the key can come
// from FIREBASE_SERVICE_ACCOUNT: the service-account JSON itself, or the same JSON base64-encoded
// (safer to paste: one line, no quotes or newlines). Locally, GOOGLE_APPLICATION_CREDENTIALS=<file> still works.
// No Next.js imports: also used by scripts/live-worker.mts.
import { applicationDefault, cert } from "firebase-admin/app";

export function firebaseCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return applicationDefault();
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  try {
    return cert(JSON.parse(json));
  } catch {
    // Never echo the value: it is a private key.
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid service-account JSON (or base64 of it)");
  }
}
