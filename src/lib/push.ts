import webpush from "web-push";
import { prisma } from "@/lib/db";

function vapidConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return null;
  }

  webpush.setVapidDetails("mailto:alerts@plateping.vercel.app", publicKey, privateKey);
  return webpush;
}

export function publicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

export async function sendPushAlert(userId: string, title: string, body: string) {
  const client = vapid();
  if (!client || !vapidConfigured()) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({
    title,
    body,
    url: "/app/alerts",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await client.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
      } catch (error) {
        const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        }
      }
    }),
  );
}
