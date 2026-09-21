"use client";

import { useState } from "react";
import { formatPlanUsage } from "@/lib/plans";
import { OFFICIAL_ZRP_LIST_STATEMENT } from "@/lib/plates";
import type { VehicleView } from "@/lib/vehicles";

type Limits = { vehicles: number | null; label: string };

type Props = {
  initialVehicles: VehicleView[];
  limits: Limits;
};

// Seeded from the server render, so the list is on screen before this component
// hydrates. Reloads only happen after the user adds or removes a plate.
export function VehiclesClient({ initialVehicles, limits }: Props) {
  const [plate, setPlate] = useState("");
  const [label, setLabel] = useState("");
  const [vehicles, setVehicles] = useState<VehicleView[]>(initialVehicles);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/vehicles");
    const data = (await response.json()) as { vehicles: VehicleView[] };
    if (response.ok) {
      setVehicles(data.vehicles);
    }
  }

  async function addPlate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate, label }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Could not add that plate.");
      return;
    }
    setPlate("");
    setLabel("");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/vehicles?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Watched plates</h1>
        <p className="text-sm text-muted">
          {`${formatPlanUsage(vehicles.length, limits.vehicles, "plates")} on ${limits.label}`}
        </p>
      </div>

      <form onSubmit={addPlate} className="card space-y-3 p-4">
        <input
          className="field uppercase tracking-[0.16em]"
          placeholder="Registration"
          value={plate}
          onChange={(event) => setPlate(event.target.value.toUpperCase())}
          required
        />
        <input
          className="field"
          placeholder="Label, e.g. Work Hilux"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn btn-primary" type="submit">
          Watch this plate
        </button>
      </form>

      <div className="space-y-3">
        {vehicles.length === 0 ? (
          <p className="text-sm text-muted">No plates yet. Add the regs you actually drive.</p>
        ) : (
          vehicles.map((vehicle) => (
            <div key={vehicle.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-semibold tracking-wide">{vehicle.plateDisplay}</p>
                <p className="text-sm text-muted">{vehicle.label || "No label"}</p>
                <p className={`mt-1 text-xs ${vehicle.listed ? "text-danger" : "text-green"}`}>
                  {vehicle.listed ? "Listed on a ZRP robot list" : "Clear on current lists"}
                </p>
                {vehicle.listings.map((listing) => (
                  <p key={`${vehicle.id}-${listing.source}`} className="mt-1 text-xs text-muted">
                    {listing.offence}
                    {listing.location ? ` · ${listing.location}` : ""}
                    {listing.publishedOn ? ` · ${listing.publishedOn}` : ""}
                    {listing.sourceUrl ? (
                      <>
                        {" · "}
                        <a
                          className="text-green underline"
                          href={listing.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {OFFICIAL_ZRP_LIST_STATEMENT.shortLabel}
                        </a>
                      </>
                    ) : null}
                  </p>
                ))}
              </div>
              <button className="text-sm text-muted" onClick={() => remove(vehicle.id)} type="button">
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
