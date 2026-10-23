import { notFound } from "next/navigation";

// Unknown addresses like /en/xyz: show our 404 page (inside the site layout) instead of Next's plain one.
export default function CatchAll() {
  notFound();
}
