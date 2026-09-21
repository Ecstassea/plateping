import { TabScreen } from "@/components/TabScreen";
import { listAlerts } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { AlertsClient } from "./alerts-client";

export default async function AlertsPage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }

  return (
    <TabScreen>
      <AlertsClient initialAlerts={await listAlerts(session.userId, session.organizationId)} />
    </TabScreen>
  );
}
