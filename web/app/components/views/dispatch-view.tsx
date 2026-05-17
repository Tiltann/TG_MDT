"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function DispatchView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">Dispatch</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost">Active Units</Button>
          <Button>Assign</Button>
        </div>
      </div>

      <Card className="p-4">
        <p className="card-sub">Dispatch console</p>
        <div className="mt-4">Map and unit list placeholders</div>
      </Card>
    </div>
  );
}
