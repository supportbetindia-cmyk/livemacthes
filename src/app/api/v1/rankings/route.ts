import { getRankings } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// ICC rankings (all formats, men & women).
export function GET() {
  return json(() => getRankings());
}
