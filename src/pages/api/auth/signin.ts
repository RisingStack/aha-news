import type { APIRoute } from "astro";
import { lucia } from "../../../auth";
import { Argon2id } from "oslo/password";
import { findUserByEmail } from "../../../contexts/User";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();

  const email = formData.get("email");
  if (!email || typeof email !== "string") {
    return new Response("Invalid email", {
      status: 400,
    });
  }
  const password = formData.get("password");
  if (!password || typeof password !== "string") {
    return new Response(null, {
      status: 400,
    });
  }

  const user = await findUserByEmail(email);

  if (!user) {
    // NOTE:
    // Returning immediately allows malicious actors to figure out valid emails from response times,
    // allowing them to only focus on guessing passwords in brute-force attacks.
    // As a preventive measure, you may want to hash passwords even for invalid emails.
    // However, valid emails can be already be revealed with the signup page
    // and a similar timing issue can likely be found in password reset implementation.
    // It will also be much more resource intensive.
    // Since protecting against this is none-trivial,
    // it is crucial your implementation is protected against brute-force attacks with login throttling etc.
    // If emails/usernames are public, you may outright tell the user that the username is invalid.
    return new Response("Invalid email or password", {
      status: 400,
    });
  }

  const validPassword = await new Argon2id().verify(
    user.passwordHash,
    password
  );
  if (!validPassword) {
    return new Response("Invalid email or password", {
      status: 400,
    });
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
};
