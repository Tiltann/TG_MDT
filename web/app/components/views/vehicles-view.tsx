"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function VehiclesView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">Vehicles</h3>
        <Button>New Vehicle</Button>
      </div>
      <Card className="p-4">
        <p className="card-sub">Vehicle registry Placeholder</p>
      </Card>
    </div>
  );
}
