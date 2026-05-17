"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function PersonsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">Persons</h3>
        <Button>New Person</Button>
      </div>
      <Card className="p-4">
        <p className="card-sub">Person search and records Placeholder</p>
      </Card>
    </div>
  );
}
