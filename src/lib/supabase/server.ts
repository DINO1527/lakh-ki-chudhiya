import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export function isSupabaseServerConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || key.startsWith("replace-with-")) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const isLocalDevelopment =
      parsedUrl.protocol === "http:" &&
      (parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost");

    return parsedUrl.protocol === "https:" || isLocalDevelopment;
  } catch {
    return false;
  }
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!isSupabaseServerConfigured() || !url || !key) {
    throw new Error("Supabase development environment is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies; route handlers can.
        }
      },
    },
  });
}
