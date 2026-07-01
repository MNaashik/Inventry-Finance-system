import React, { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface DropdownOptionEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

export default function DropdownOptionEditor({ options, onChange }: DropdownOptionEditorProps) {
  const [newOption, setNewOption] = useState("");
  const [error, setError] = useState("");

  const handleAddOption = () => {
    const val = newOption.trim();
    if (!val) return;
    if (options.some((o) => o.toLowerCase() === val.toLowerCase())) {
      setError("Duplicate option value is not allowed.");
      return;
    }
    setError("");
    onChange([...options, val]);
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    onChange(options.filter((_, idx) => idx !== index));
  };

  const handleEditOption = (index: number, newValue: string) => {
    const updated = [...options];
    updated[index] = newValue;
    onChange(updated);
  };

  const moveOption = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-white/5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Dropdown Options</label>
      
      {/* List of options */}
      {options.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No options added yet. Add at least one option.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                suppressHydrationWarning
                type="text"
                value={opt}
                onChange={(e) => handleEditOption(index, e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-slate-900 py-1.5 px-3 text-xs text-white outline-none focus:border-primary"
              />
              
              {/* Reordering */}
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => moveOption(index, "up")}
                disabled={index === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition cursor-pointer"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => moveOption(index, "down")}
                disabled={index === options.length - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition cursor-pointer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              
              {/* Delete */}
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => handleRemoveOption(index)}
                className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Option input */}
      <div className="flex gap-2">
        <input
          suppressHydrationWarning
          type="text"
          value={newOption}
          onChange={(e) => {
            setNewOption(e.target.value);
            setError("");
          }}
          placeholder="e.g. Green, XL, 8GB"
          className="flex-1 rounded-lg border border-white/10 bg-slate-900 py-1.5 px-3 text-xs text-white outline-none focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddOption();
            }
          }}
        />
        <button
          suppressHydrationWarning
          type="button"
          onClick={handleAddOption}
          className="rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 p-2 text-primary transition cursor-pointer flex items-center justify-center"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="text-[10px] text-rose-400 font-semibold">{error}</p>
      )}
    </div>
  );
}
