import React, { useState, useEffect } from "react";
import { Sparkles, Trash2, Plus, ArrowRight } from "lucide-react";
import { CategoryAttributeWithRelations } from "./dynamic-product-attribute-form";

export interface VariantData {
  id?: string;
  sku: string;
  barcode: string;
  price: string;
  purchasePrice: string;
  stock: string;
  status: "ACTIVE" | "INACTIVE";
  attributeValueMap: Record<string, string>; // maps attributeId -> value string
  combinationLabel: string; // e.g. "Red / M"
}

interface VariantGeneratorGridProps {
  attributes: CategoryAttributeWithRelations[];
  initialVariants?: VariantData[];
  onChange: (variants: VariantData[]) => void;
  parentSku: string;
  parentPrice: string;
}

export default function VariantGeneratorGrid({
  attributes,
  initialVariants = [],
  onChange,
  parentSku,
  parentPrice,
}: VariantGeneratorGridProps) {
  // Option selection state: maps attributeId -> list of selected string values
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  // Input state for custom text attribute inputs
  const [customTextInputs, setCustomTextInputs] = useState<Record<string, string>>({});
  // List of generated variants in the grid
  const [variants, setVariants] = useState<VariantData[]>(initialVariants);

  // Initialize selected options from initial variants if provided
  useEffect(() => {
    if (initialVariants.length > 0) {
      const opts: Record<string, string[]> = {};
      initialVariants.forEach((v) => {
        Object.entries(v.attributeValueMap).forEach(([attrId, val]) => {
          if (!opts[attrId]) opts[attrId] = [];
          if (!opts[attrId].includes(val)) {
            opts[attrId].push(val);
          }
        });
      });
      setSelectedOptions(opts);
      setVariants(initialVariants);
    }
  }, [initialVariants]);

  // Handle select/deselect of option values
  const handleToggleOption = (attributeId: string, val: string) => {
    const current = selectedOptions[attributeId] || [];
    let next: string[];
    if (current.includes(val)) {
      next = current.filter((v) => v !== val);
    } else {
      next = [...current, val];
    }
    const updated = { ...selectedOptions, [attributeId]: next };
    setSelectedOptions(updated);
  };

  // Add custom text tag
  const handleAddCustomText = (attributeId: string) => {
    const rawVal = customTextInputs[attributeId] || "";
    const val = rawVal.trim();
    if (!val) return;
    const current = selectedOptions[attributeId] || [];
    if (!current.includes(val)) {
      setSelectedOptions({ ...selectedOptions, [attributeId]: [...current, val] });
    }
    setCustomTextInputs({ ...customTextInputs, [attributeId]: "" });
  };

  // Cartesian Product helper
  const cartesianProduct = (arrays: { attributeId: string; values: string[] }[]): Record<string, string>[][] => {
    const cleanArrays = arrays.filter((a) => a.values.length > 0);
    if (cleanArrays.length === 0) return [];
    
    return cleanArrays.reduce<Record<string, string>[][]>(
      (acc, curr) => {
        const res: Record<string, string>[][] = [];
        acc.forEach((combo) => {
          curr.values.forEach((val) => {
            res.push([...combo, { [curr.attributeId]: val }]);
          });
        });
        return res;
      },
      [[]]
    );
  };

  // Generate Cartesian combinations
  const handleGenerate = () => {
    const arrayInputs = attributes.map((attr) => ({
      attributeId: attr.id,
      values: selectedOptions[attr.id] || [],
    }));

    const combos = cartesianProduct(arrayInputs);
    if (combos.length === 0) return;

    const generated: VariantData[] = combos.map((combo, idx) => {
      // Build attributeValueMap
      const attributeValueMap: Record<string, string> = {};
      combo.forEach((item) => {
        const [attrId, val] = Object.entries(item)[0];
        attributeValueMap[attrId] = val;
      });

      // Construct label
      const labels = attributes
        .map((attr) => attributeValueMap[attr.id])
        .filter(Boolean);
      const combinationLabel = labels.join(" / ");

      // Construct clean default SKU
      const skuSuffix = labels.map((l) => l.slice(0, 3).toUpperCase().replace(/\s+/g, "")).join("-");
      const derivedSku = parentSku ? `${parentSku.toUpperCase()}-${skuSuffix}` : "";

      // See if matching variant exists in current state to preserve values
      const existing = variants.find(
        (v) =>
          Object.entries(attributeValueMap).every(([aid, val]) => v.attributeValueMap[aid] === val)
      );

      return existing || {
        sku: derivedSku,
        barcode: "",
        price: parentPrice || "",
        purchasePrice: "",
        stock: "0",
        status: "ACTIVE" as const,
        attributeValueMap,
        combinationLabel,
      };
    });

    setVariants(generated);
    onChange(generated);
  };

  const handleUpdateVariantField = (idx: number, field: keyof VariantData, val: string) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: val };
    setVariants(updated);
    onChange(updated);
  };

  const handleDeleteVariant = (idx: number) => {
    const updated = variants.filter((_, i) => i !== idx);
    setVariants(updated);
    onChange(updated);
  };

  if (attributes.length === 0) return null;

  return (
    <div className="space-y-6 border-t border-white/5 pt-6 animate-fadeIn">
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configure Attributes & Generate Variants</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">Select option values and click generate to calculate all unique variants.</p>
      </div>

      {/* Select options values */}
      <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
        {attributes.map((attr) => (
          <div key={attr.id} className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 capitalize">{attr.name}</label>
            
            {attr.type === "DROPDOWN" ? (
              <div className="flex flex-wrap gap-2">
                {attr.options.map((opt) => {
                  const isSelected = (selectedOptions[attr.id] || []).includes(opt.value);
                  return (
                    <button
                      suppressHydrationWarning
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleOption(attr.id, opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-bold"
                          : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {opt.value}
                    </button>
                  );
                })}
              </div>
            ) : (
              // Text Attribute custom tag editor
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={customTextInputs[attr.id] || ""}
                    onChange={(e) => setCustomTextInputs({ ...customTextInputs, [attr.id]: e.target.value })}
                    placeholder={`Add custom tag for ${attr.name.toLowerCase()} (e.g. Cotton, 128GB)...`}
                    className="flex-1 rounded-lg border border-white/10 bg-slate-900 py-1.5 px-3 text-xs text-white outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomText(attr.id);
                      }
                    }}
                  />
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => handleAddCustomText(attr.id)}
                    className="rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 p-2 text-primary transition cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Custom text tag list */}
                {(selectedOptions[attr.id] || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedOptions[attr.id] || []).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-[10px] text-slate-300"
                      >
                        {tag}
                        <button
                          suppressHydrationWarning
                          type="button"
                          onClick={() => handleToggleOption(attr.id, tag)}
                          className="hover:text-rose-400 transition cursor-pointer font-bold ml-1 text-slate-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button
            suppressHydrationWarning
            type="button"
            onClick={handleGenerate}
            className="rounded-xl bg-primary hover:bg-primary/95 text-slate-950 px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Variants
          </button>
        </div>
      </div>

      {/* Generated variant grid */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Edit Generated Variants</label>
          <div className="rounded-xl border border-white/5 bg-slate-950/20 overflow-x-auto">
            <table className="w-full text-left text-xs text-white border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-3 py-2.5">Variant</th>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Barcode</th>
                  <th className="px-3 py-2.5">Stock</th>
                  <th className="px-3 py-2.5">Price ($)</th>
                  <th className="px-3 py-2.5">Cost ($)</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {variants.map((v, idx) => (
                  <tr key={idx} className="hover:bg-white/2 transition">
                    {/* combination label */}
                    <td className="px-3 py-2 font-bold text-primary max-w-[120px] truncate" title={v.combinationLabel}>
                      {v.combinationLabel}
                    </td>
                    {/* SKU input */}
                    <td className="px-3 py-2">
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleUpdateVariantField(idx, "sku", e.target.value)}
                        placeholder="Variant SKU..."
                        className="w-full rounded-lg border border-white/10 bg-slate-900 py-1 px-2 text-xs text-white outline-none focus:border-primary"
                      />
                    </td>
                    {/* Barcode input */}
                    <td className="px-3 py-2">
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={v.barcode}
                        onChange={(e) => handleUpdateVariantField(idx, "barcode", e.target.value)}
                        placeholder="Barcode..."
                        className="w-full rounded-lg border border-white/10 bg-slate-900 py-1 px-2 text-xs text-white outline-none focus:border-primary"
                      />
                    </td>
                    {/* Stock input */}
                    <td className="px-3 py-2 w-20">
                      <input
                        suppressHydrationWarning
                        type="number"
                        min="0"
                        required
                        value={v.stock}
                        onChange={(e) => handleUpdateVariantField(idx, "stock", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900 py-1 px-2 text-xs text-white outline-none focus:border-primary"
                      />
                    </td>
                    {/* Price input */}
                    <td className="px-3 py-2 w-24">
                      <input
                        suppressHydrationWarning
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.price}
                        onChange={(e) => handleUpdateVariantField(idx, "price", e.target.value)}
                        placeholder={parentPrice || "0.00"}
                        className="w-full rounded-lg border border-white/10 bg-slate-900 py-1 px-2 text-xs text-white outline-none focus:border-primary"
                      />
                    </td>
                    {/* Cost input */}
                    <td className="px-3 py-2 w-24">
                      <input
                        suppressHydrationWarning
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.purchasePrice}
                        onChange={(e) => handleUpdateVariantField(idx, "purchasePrice", e.target.value)}
                        placeholder="Cost..."
                        className="w-full rounded-lg border border-white/10 bg-slate-900 py-1 px-2 text-xs text-white outline-none focus:border-primary"
                      />
                    </td>
                    {/* Status select */}
                    <td className="px-3 py-2 w-28">
                      <select
                        suppressHydrationWarning
                        value={v.status}
                        onChange={(e) => handleUpdateVariantField(idx, "status", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900 py-1 px-2 text-xs text-white outline-none focus:border-primary"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </td>
                    {/* Delete button */}
                    <td className="px-3 py-2 text-center">
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => handleDeleteVariant(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 italic">
            <span>Parent total stock updates dynamically to: {variants.reduce((sum, v) => sum + (v.status === "ACTIVE" ? parseInt(v.stock, 10) || 0 : 0), 0)} units</span>
          </div>
        </div>
      )}
    </div>
  );
}
