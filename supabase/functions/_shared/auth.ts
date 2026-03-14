import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const getAuthenticatedUserContext = async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("x-user-auth") ?? req.headers.get("Authorization");

  if (!authHeader) {
    throw new HttpError(401, "Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const userClient = createClient(supabaseUrl, anonKey);
  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

  if (error || !user) {
    throw new HttpError(401, "Unauthorized");
  }

  return { user, svc };
};
