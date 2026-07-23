import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { json } from "@/lib/chat-request";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireServerSession() {
  const session = await getServerSession();

  if (!session?.user) {
    return {
      session: null,
      response: json({ error: "Authentication required." }, 401),
    };
  }

  return { session, response: null };
}

