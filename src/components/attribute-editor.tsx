import React from "react";
import { Plus, Trash2 } from "lucide-react";
import DropdownOptionEditor from "./dropdown-option-editor";

export interface AttributeDefinition {
  id?: string;
  name: string;
  type: "TEXT" | "DROPDOWN";
  options: string[];
}

interface AttributeEditorProps {
  attributes: AttributeDefinition[];
  onChange: (attributes: AttributeDefinition[]) => void;
}

export default function AttributeEditor({ attributes, onChange }: AttributeEditorProps) {
  const handleAddAttribute = () => {
    const newAttr: AttributeDefinition = {
      name: "",
      type: "TEXT",
      options: [],
    };
    onChange([...attributes, newAttr]);
  };

  const handleRemoveAttribute = (idx: number) => {
    onChange(attributes.filter((_, i) => i !== idx));
  };

  const handleUpdateAttribute = (idx: number, updated: Partial<AttributeDefinition>) => {
    const next = [...attributes];
    next[idx] = { ...next[idx], ...updated };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Product Attributes</h4>
        <button
          suppressHydrationWarning
          type="button"
          onClick={handleAddAttribute}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Attribute
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-white/5 rounded-xl bg-slate-900/10">
          <p className="text-xs text-slate-500">No custom attributes configured for this category.</p>
          <p className="text-[10px] text-slate-600 mt-1">Add attributes like color, size, capacity, or storage.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {attributes.map((attr, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-white/5 bg-slate-900/20 space-y-3 relative group">
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => handleRemoveAttribute(idx)}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Attribute Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attribute Name</label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    required
                    value={attr.name}
                    onChange={(e) => handleUpdateAttribute(idx, { name: e.target.value })}
                    placeholder="e.g. Color, Size, RAM"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-2 px-3 text-xs text-white outline-none focus:border-primary"
                  />
                </div>

                {/* Input Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Input Type</label>
                  <select
                    suppressHydrationWarning
                    value={attr.type}
                    onChange={(e) =>
                      handleUpdateAttribute(idx, {
                        type: e.target.value as "TEXT" | "DROPDOWN",
                        options: e.target.value === "TEXT" ? [] : attr.options,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-2 px-3 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="TEXT">Text Input</option>
                    <option value="DROPDOWN">Dropdown List</option>
                  </select>
                </div>
              </div>

              {/* Options Editor (Only if DROPDOWN) */}
              {attr.type === "DROPDOWN" && (
                <DropdownOptionEditor
                  options={attr.options}
                  onChange={(options) => handleUpdateAttribute(idx, { options })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
