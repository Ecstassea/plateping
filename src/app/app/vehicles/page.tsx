import { TabScreen } from "@/components/TabScreen";
import { requireSession } from "@/lib/auth";
import { getLimits } from "@/lib/plans";
import { listVehicles } from "@/lib/vehicles";
import { VehiclesClient } from "./vehicles-client";

export default async function VehiclesPage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }

  const limits = getLimits(session.organization);

  return (
    <TabScreen>
      <VehiclesClient
        initialVehicles={await listVehicles(session.organizationId)}
        limits={{ vehicles: limits.vehicles, label: limits.label }}
      />
    </TabScreen>
  );
}
