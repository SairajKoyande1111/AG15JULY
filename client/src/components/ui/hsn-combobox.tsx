import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { HSN_CODES } from "@/lib/hsn-codes";

export function HsnCombobox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [addingNew, setAddingNew] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const newCodeRef = useRef<HTMLInputElement>(null);

  const { data: dbCodes = [] } = useQuery<{ id: string; code: string; description: string }[]>({
    queryKey: [api.masters.hsnCodes.list.path],
  });

  const addMutation = useMutation({
    mutationFn: (data: { code: string; description: string }) =>
      apiRequest("POST", api.masters.hsnCodes.create.path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.masters.hsnCodes.list.path] });
    },
  });

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNew(false);
        setNewCode("");
        setNewDescription("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus code input when add form opens
  useEffect(() => {
    if (addingNew) {
      setTimeout(() => newCodeRef.current?.focus(), 50);
    }
  }, [addingNew]);

  const dbCodeSet = new Set(dbCodes.map(c => c.code));
  const allCodes = [
    ...dbCodes,
    ...HSN_CODES.filter(h => !dbCodeSet.has(h.code)),
  ];

  const filtered = allCodes.filter(h =>
    !search || h.code.includes(search) || h.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmAdd = () => {
    if (!newCode.trim() || !newDescription.trim()) return;
    addMutation.mutate({ code: newCode.trim(), description: newDescription.trim() }, {
      onSuccess: () => {
        onChange(newCode.trim());
        setSearch(newCode.trim());
        setOpen(false);
        setAddingNew(false);
        setNewCode("");
        setNewDescription("");
      }
    });
  };

  const handleOpenAddForm = () => {
    // Pre-fill code field with whatever user typed if it looks like a code
    setNewCode(search && !allCodes.some(h => h.code === search) ? search : "");
    setNewDescription("");
    setAddingNew(true);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        className="h-11 text-sm"
        placeholder={placeholder || "HSN code (search or type)..."}
        value={search}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={e => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setAddingNew(false);
        }}
      />
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[9999] bg-white border border-border rounded-lg shadow-2xl max-h-72 overflow-y-auto min-w-[320px] w-full">
          {/* Existing / filtered codes */}
          {filtered.map(h => (
            <button
              key={h.code}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0"
              onMouseDown={e => { e.preventDefault(); onChange(h.code); setSearch(h.code); setOpen(false); }}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-xs text-red-600">{h.code}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{h.description}</span>
              </div>
            </button>
          ))}

          {filtered.length === 0 && !addingNew && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matching HSN codes found.</div>
          )}

          {/* Always-visible Add New button */}
          {!addingNew && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors text-red-600 font-semibold text-xs flex items-center gap-1.5 border-t border-border/40 sticky bottom-0 bg-white"
              onMouseDown={e => { e.preventDefault(); handleOpenAddForm(); }}
            >
              <span className="text-base leading-none font-bold">+</span> Add New HSN Code
            </button>
          )}

          {/* Add form */}
          {addingNew && (
            <div className="px-4 py-3 border-t border-border/30 space-y-3 bg-white">
              <p className="text-sm font-bold text-slate-800">Add New HSN Code</p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  HSN Code <span className="text-red-500">*</span>
                </label>
                <Input
                  ref={newCodeRef}
                  className="h-9 text-sm font-mono"
                  placeholder="e.g. 998713"
                  value={newCode}
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => setNewCode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); handleConfirmAdd(); }
                    if (e.key === "Escape") { setAddingNew(false); setNewCode(""); setNewDescription(""); }
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. PPF Installation / Ceramic Coating"
                  value={newDescription}
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => setNewDescription(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); handleConfirmAdd(); }
                    if (e.key === "Escape") { setAddingNew(false); setNewCode(""); setNewDescription(""); }
                  }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 bg-red-600 text-white text-xs font-semibold rounded-md px-3 py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  onMouseDown={e => { e.preventDefault(); handleConfirmAdd(); }}
                  disabled={!newCode.trim() || !newDescription.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? "Saving..." : "Add HSN Code"}
                </button>
                <button
                  type="button"
                  className="text-xs text-slate-500 px-3 py-2 hover:text-slate-700 border border-slate-200 rounded-md"
                  onMouseDown={e => { e.preventDefault(); setAddingNew(false); setNewCode(""); setNewDescription(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
