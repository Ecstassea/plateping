import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db";
import { randomInviteCode } from "../src/lib/invite";
import { notifyWatchers } from "../src/lib/notify";
import { displayPlate, ROBOT_OFFENCE } from "../src/lib/plates";
import { syncFineLists } from "../src/lib/scraper";

async function main() {
  await syncFineLists();

  const passwordHash = await hash("demo1234", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@plateping.co" },
    update: {},
    create: {
      email: "demo@plateping.co",
      name: "Tari Demo",
      passwordHash,
      memberships: {
        create: {
          role: "owner",
          organization: {
            create: {
              name: "Demo Driver",
              type: "personal",
              inviteCode: randomInviteCode(),
              plan: "starter",
              subscriptionStatus: "trialing",
              currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  const fleetOwner = await prisma.user.upsert({
    where: { email: "fleet@plateping.co" },
    update: {},
    create: {
      email: "fleet@plateping.co",
      name: "Fleet Admin",
      passwordHash,
      memberships: {
        create: {
          role: "owner",
          organization: {
            create: {
              name: "Harare Couriers",
              type: "company",
              inviteCode: "FLEET001",
              plan: "fleet",
              subscriptionStatus: "trialing",
              currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  const demoOrg = demo.memberships[0]?.organizationId;
  const fleetOrg = fleetOwner.memberships[0]?.organizationId;

  if (demoOrg) {
    await prisma.vehicle.upsert({
      where: {
        organizationId_plateNormalized: {
          organizationId: demoOrg,
          plateNormalized: "ADX5897",
        },
      },
      update: {},
      create: {
        organizationId: demoOrg,
        plateNormalized: "ADX5897",
        plateDisplay: displayPlate("ADX5897"),
        label: "Family sedan",
      },
    });
    await notifyWatchers("ADX5897", ROBOT_OFFENCE);
  }

  if (fleetOrg) {
    await prisma.vehicle.upsert({
      where: {
        organizationId_plateNormalized: {
          organizationId: fleetOrg,
          plateNormalized: "AFN2566",
        },
      },
      update: {},
      create: {
        organizationId: fleetOrg,
        plateNormalized: "AFN2566",
        plateDisplay: displayPlate("AFN2566"),
        label: "Delivery 1",
      },
    });
    await notifyWatchers("AFN2566", ROBOT_OFFENCE);
  }

  console.log("Seeded demo@plateping.co / fleet@plateping.co password demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
