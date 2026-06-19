import { PrismaClient } from "@prisma/client";
import { hashPassword, pickAvatarColor } from "../src/lib/jwt";

const prisma = new PrismaClient();

async function main() {
  const password = await hashPassword("demo123");

  const alice = await prisma.user.upsert({
    where: { username: "alice" },
    update: {},
    create: {
      username: "alice",
      name: "Alice Chen",
      password,
      color: pickAvatarColor("alice"),
    },
  });

  const bob = await prisma.user.upsert({
    where: { username: "bob" },
    update: {},
    create: {
      username: "bob",
      name: "Bob Martinez",
      password,
      color: pickAvatarColor("bob"),
    },
  });

  const carol = await prisma.user.upsert({
    where: { username: "carol" },
    update: {},
    create: {
      username: "carol",
      name: "Carol Williams",
      password,
      color: pickAvatarColor("carol"),
    },
  });

  console.log("Seeded demo users:");
  console.log("  alice / demo123");
  console.log("  bob   / demo123");
  console.log("  carol / demo123");
  console.log({ alice: alice.id, bob: bob.id, carol: carol.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
