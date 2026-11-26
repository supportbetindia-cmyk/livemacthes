import { getTeams } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// All teams.
export function GET() {
  return json(() => getTeams());
}
