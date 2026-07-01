import React from "react";

export interface CategoryAttributeWithRelations {
  id: string;
  name: string;
  type: string; // "TEXT" or "DROPDOWN"
  options: { id: string; value: string }[];
}

interface DynamicProductAttributeFormProps {
  attributes: CategoryAttributeWithRelations[];
  values: Record<string, string>; // Maps attributeId -> selected/inputted value string
  onChange: (values: Record<string, string>) => void;
}

export default function DynamicProductAttributeForm({
  attributes,
  values,
  onChange,
}: DynamicProductAttributeFormProps) {
  const handleValueChange = (attributeId: string, val: string) => {
    onChange({
      ...values,
      [attributeId]: val,
    });
  };

  if (attributes.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-white/5 pt-4 animate-fadeIn">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Attributes</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        {attributes.map((attr) => (
          <div key={attr.id} className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 capitalize">{attr.name}</label>
            
            {attr.type === "DROPDOWN" ? (
              <select
                suppressHydrationWarning
                value={values[attr.id] || ""}
                onChange={(e) => handleValueChange(attr.id, e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="">Select option...</option>
                {attr.options.map((opt) => (
                  <option key={opt.id} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
            ) : (
              <input
                suppressHydrationWarning
                type="text"
                value={values[attr.id] || ""}
                onChange={(e) => handleValueChange(attr.id, e.target.value)}
                placeholder={`Enter ${attr.name.toLowerCase()}...`}
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 px-3 text-xs text-white outline-none focus:border-primary"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
