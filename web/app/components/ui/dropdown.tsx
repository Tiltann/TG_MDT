"use client";
import { useState } from "react";

export function Dropdown({ label, children }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((s) => !s)} className="mdt-btn mdt-btn-ghost">
        {label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-md p-2 z-40">
          {children}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
