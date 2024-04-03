import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ cookies, redirect, locals }) => {
  cookies.delete("auth_session", { path: "/" });
  locals.user = null;
  locals.session = null;
  return redirect("/");
};
