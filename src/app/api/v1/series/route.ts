import { getSeriesList } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Series list (built from the cached match list — no extra provider request).
export function GET() {
  return json(() => getSeriesList());
}
