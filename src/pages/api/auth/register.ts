import { lucia } from "../../../auth";
import { generateId } from "lucia";
import { Argon2id } from "oslo/password";
import { z } from "astro:content";
import { createUser } from "../../../contexts/User";
import { capitalizeFirstLetter } from "../../../helpers";
import type { APIRoute } from "astro";

const formObjectSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(6),
});

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  let formObject;
  try {
    formObject = formObjectSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
    });
  } catch (error) {
    return new Response(JSON.stringify(error.format()), {
      status: 400,
    });
  }

  try {
    await createUser(formObject);
  } catch (err) {
    switch (err.code) {
      case "P2002":
        const targets = err.meta.target.map(capitalizeFirstLetter).join(", ");

        return new Response(`${targets} already exist`, {
          status: 409,
        });
      default:
        return new Response(null, {
          status: 500,
        });
    }
  }
};
