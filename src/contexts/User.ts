import { prisma } from "../prisma";
import { generateId } from "lucia";
import { Argon2id } from "oslo/password";

export type { User } from "lucia";

export async function createUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  const passwordHash = await new Argon2id().hash(password);
  const userId = generateId(15);

  return prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      passwordHash,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
