"use client";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[720px] p-6">
        <div className="bg-[var(--mdt-bg-panel)] border border-[var(--mdt-border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{title}</h3>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-white/5"><X className="w-4 h-4"/></button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
