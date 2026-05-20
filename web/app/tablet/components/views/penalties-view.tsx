"use client";

import { useState } from "react";
import { Scale, Search, Trash2, Clipboard, Check, Plus, Minus, ShieldAlert } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { TFunction } from "../../lib/i18n";

type Offense = {
  code: string;
  category: "traffic" | "property" | "violent";
  labelKey: string;
  name: string;
  fine: number;
  prison: number;
};

const defaultOffenses: Offense[] = [
  // Traffic
  { code: "§315c", category: "traffic", labelKey: "tablet.penalties.speeding", name: "Speeding (Over 30 km/h)", fine: 500, prison: 0 },
  { code: "§21", category: "traffic", labelKey: "tablet.penalties.nolicense", name: "Driving Without License", fine: 1500, prison: 0 },
  { code: "§142", category: "traffic", labelKey: "tablet.penalties.hitrun", name: "Hit and Run", fine: 3000, prison: 3 },
  { code: "§315d", category: "traffic", labelKey: "tablet.penalties.racing", name: "Illegal Street Racing", fine: 5000, prison: 6 },
  { code: "§316", category: "traffic", labelKey: "tablet.penalties.dui", name: "Driving Under Influence (DUI)", fine: 2500, prison: 2 },
  
  // Property & Order
  { code: "§123", category: "property", labelKey: "tablet.penalties.trespass", name: "Trespassing", fine: 800, prison: 0 },
  { code: "§303", category: "property", labelKey: "tablet.penalties.vandalism", name: "Property Damage", fine: 1200, prison: 1 },
  { code: "§242", category: "property", labelKey: "tablet.penalties.theft", name: "Theft / Grand Theft Auto", fine: 4500, prison: 6 },
  { code: "§52", category: "property", labelKey: "tablet.penalties.weapons", name: "Illegal Weapon Possession", fine: 8000, prison: 12 },
  { code: "§29", category: "property", labelKey: "tablet.penalties.drugs", name: "Illegal Narcotics Possession", fine: 3500, prison: 4 },

  // Violent Crimes
  { code: "§223", category: "violent", labelKey: "tablet.penalties.assault", name: "Assault & Battery", fine: 4000, prison: 8 },
  { code: "§249", category: "violent", labelKey: "tablet.penalties.robbery", name: "Armed Robbery", fine: 10000, prison: 18 },
  { code: "§239b", category: "violent", labelKey: "tablet.penalties.hostage", name: "Hostage Taking", fine: 15000, prison: 24 },
  { code: "§113", category: "violent", labelKey: "tablet.penalties.resist", name: "Resisting Arrest / Fleeing", fine: 2000, prison: 3 },
  { code: "§211", category: "violent", labelKey: "tablet.penalties.murder", name: "First Degree Murder", fine: 50000, prison: 120 },
];

export default function PenaltiesView({ t }: { t: TFunction }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "traffic" | "property" | "violent">("all");
  const [basket, setBasket] = useState<Array<{ offense: Offense; count: number }>>([]);
  const [discount, setDiscount] = useState(0); // in percent (0 to 50%)
  const [copied, setCopied] = useState(false);

  const filteredOffenses = defaultOffenses.filter((offense) => {
    const matchesSearch =
      offense.code.toLowerCase().includes(search.toLowerCase()) ||
      offense.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || offense.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleAddOffense = (offense: Offense) => {
    setBasket((prev) => {
      const idx = prev.findIndex((item) => item.offense.code === offense.code);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], count: next[idx].count + 1 };
        return next;
      }
      return [...prev, { offense, count: 1 }];
    });
  };

  const handleRemoveOffense = (code: string) => {
    setBasket((prev) => prev.filter((item) => item.offense.code !== code));
  };

  const handleUpdateCount = (code: string, delta: number) => {
    setBasket((prev) => {
      const idx = prev.findIndex((item) => item.offense.code === code);
      if (idx === -1) return prev;
      const next = [...prev];
      const newCount = next[idx].count + delta;
      if (newCount <= 0) {
        return next.filter((item) => item.offense.code !== code);
      }
      next[idx] = { ...next[idx], count: newCount };
      return next;
    });
  };

  // Calculations
  const subtotalFine = basket.reduce((acc, cur) => acc + cur.offense.fine * cur.count, 0);
  const totalFine = Math.round(subtotalFine * (1 - discount / 100));
  const totalPrison = basket.reduce((acc, cur) => acc + cur.offense.prison * cur.count, 0);

  const handleCopySummary = () => {
    if (basket.length === 0) return;
    
    let text = `====================================\n`;
    text += `       MDT CRIMINAL CHARGE REPORT    \n`;
    text += `====================================\n\n`;
    text += `OFFENSES CHARGED:\n`;
    
    basket.forEach((item) => {
      text += `- [${item.offense.code}] ${item.offense.name} x${item.count}\n`;
      text += `  Fine: $${item.offense.fine * item.count} | Sentence: ${item.offense.prison * item.count} months\n`;
    });
    
    text += `\n------------------------------------\n`;
    text += `SUBTOTAL FINE:  $${subtotalFine.toLocaleString()}\n`;
    if (discount > 0) {
      text += `DISCOUNT APPLIED: ${discount}%\n`;
    }
    text += `TOTAL FINE DUE: $${totalFine.toLocaleString()}\n`;
    text += `TOTAL SENTENCE:  ${totalPrison} Months\n`;
    text += `====================================\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <Scale className="w-6 h-6 text-zinc-400" />
            {t("tablet.sidebar.penalty_catalog")}
          </h3>
          <p className="text-xs text-[var(--mdt-text-muted)] mt-1">{t("tablet.penalties.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Offenses list */}
        <div className="xl:col-span-8 flex flex-col gap-4 min-h-0">
          <Card className="p-4 bg-zinc-950/80 border-[var(--mdt-border)] rounded-2xl flex flex-col gap-4 flex-1 min-h-0 overflow-hidden shadow-xl">
            {/* Search and filter header */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-zinc-600" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by penal code or title..."
                  className="w-full bg-[var(--mdt-bg-base)] border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div className="flex bg-black/40 border border-zinc-800 p-0.5 rounded-xl shrink-0 gap-0.5">
                {(["all", "traffic", "property", "violent"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === tab
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {filteredOffenses.length === 0 ? (
                <div className="h-full min-h-48 flex items-center justify-center text-sm text-zinc-600 italic">
                  No offenses found matching filters.
                </div>
              ) : (
                filteredOffenses.map((offense) => (
                  <div
                    key={offense.code}
                    onClick={() => handleAddOffense(offense)}
                    className="grid grid-cols-12 items-center p-3 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/35 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="col-span-2 text-xs font-bold text-amber-500 group-hover:scale-105 transition-transform">
                      {offense.code}
                    </div>
                    <div className="col-span-6 text-xs text-white font-medium truncate pr-2">
                      {offense.name}
                    </div>
                    <div className="col-span-2 text-[11px] font-bold text-zinc-500 text-right">
                      {offense.prison > 0 ? `${offense.prison} mos` : "—"}
                    </div>
                    <div className="col-span-2 text-xs text-right text-emerald-400 font-bold">
                      ${offense.fine.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Charges Basket / Calculator */}
        <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
          <Card className="p-4 bg-zinc-900/90 border-zinc-800/80 rounded-2xl flex-1 flex flex-col justify-between overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-800/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex-1 flex flex-col min-h-0 gap-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Charged Offenses Basket
              </h4>

              {/* Basket list */}
              <div className="flex-1 overflow-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {basket.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-600 italic py-10">
                    Click offenses on the left to add them to the report.
                  </div>
                ) : (
                  basket.map((item) => (
                    <div
                      key={item.offense.code}
                      className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/60 flex flex-col gap-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{item.offense.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500">{item.offense.code}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveOffense(item.offense.code)}
                          className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-zinc-900/40">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateCount(item.offense.code, -1)}
                            className="w-5 h-5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-xs text-zinc-400 hover:text-white"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-white px-1.5">{item.count}</span>
                          <button
                            onClick={() => handleUpdateCount(item.offense.code, 1)}
                            className="w-5 h-5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-xs text-zinc-400 hover:text-white"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <div className="text-right text-[11px] font-medium">
                          {item.offense.prison > 0 && (
                            <span className="text-zinc-500 mr-2">{item.offense.prison * item.count} mos</span>
                          )}
                          <span className="text-emerald-400 font-bold">${(item.offense.fine * item.count).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calculations & Action Summary */}
            <div className="mt-4 pt-3.5 border-t border-zinc-800/80 space-y-3.5 bg-zinc-950/20 -mx-4 -mb-4 p-4 shrink-0 rounded-b-2xl">
              {/* Cooperation Discount */}
              {basket.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                    <span>Cooperation Discount</span>
                    <span className="text-amber-500">{discount}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="10"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              )}

              {/* Totals display */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-black/30 border border-zinc-800/60 p-2.5 rounded-xl text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Sentence</p>
                  <p className="text-lg font-black text-white mt-0.5">{totalPrison} <span className="text-xs text-zinc-400 font-bold">Mos</span></p>
                </div>
                <div className="bg-black/30 border border-zinc-800/60 p-2.5 rounded-xl text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Fine Due</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">${totalFine.toLocaleString()}</p>
                </div>
              </div>

              {/* Copy Report Action */}
              <Button
                onClick={handleCopySummary}
                disabled={basket.length === 0}
                className={`w-full h-10 rounded-xl text-xs font-bold transition-all ${
                  copied 
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white" 
                    : "bg-zinc-200 hover:bg-white text-black"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied Summary!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4 mr-2" />
                    Copy Charge Summary
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
