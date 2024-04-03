import { PrismaClient } from "@prisma/client";

let client;

if (!client) {
  client = new PrismaClient();
}

export const prisma = client;
