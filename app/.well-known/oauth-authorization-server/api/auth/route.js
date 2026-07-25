import { redirect } from "next/navigation";

export function GET() {
  redirect("/api/auth/.well-known/oauth-authorization-server");
}
