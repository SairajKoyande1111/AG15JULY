import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ShoppingCart, Plus, Search, Package, Layers, ChevronLeft, ChevronRight,
  Trash2, X, AlertTriangle, IndianRupee, Pencil
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ResellOrder, AccessoryMaster, PPFMaster } from "@shared/schema";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit"];
const PAGE_SIZE = 10;

function formatCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
      <p className="text-xs text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="text-xs text-muted-foreground px-1">…</span>
            ) : (
              <Button key={p} variant={page === p ? "default" : "outline"} size="sm"
                className={`h-7 w-7 p-0 text-xs ${page === p ? "bg-primary text-white" : ""}`}
                onClick={() => onChange(p as number)}>
                {p}
              </Button>
            )
          )}
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── INVENTORY OVERVIEW ───────────────────────────────────────────────────────
function InventoryOverview({ accessories, ppfs }: { accessories: AccessoryMaster[]; ppfs: PPFMaster[] }) {
  const [showAccDetails, setShowAccDetails] = useState(false);
  const [showPPFDetails, setShowPPFDetails] = useState(false);

  const totalAccQty = accessories.reduce((s, a) => s + (a.quantity ?? 0), 0);
  const lowStockAcc = accessories.filter(a => (a.quantity ?? 0) > 0 && (a.quantity ?? 0) <= 5);
  const outOfStockAcc = accessories.filter(a => (a.quantity ?? 0) === 0);

  const totalPPFRolls = ppfs.reduce((s, p) => s + (p.rolls?.length ?? 0), 0);
  const totalPPFSqft = ppfs.reduce((s, p) => s + (p.rolls ?? []).reduce((rs, r) => rs + (r.stock ?? 0), 0), 0);
  const activeRolls = ppfs.flatMap(p => (p.rolls ?? []).filter(r => r.stock > 10));
  const depletedRolls = ppfs.flatMap(p => (p.rolls ?? []).filter(r => r.stock <= 10));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Accessories Card */}
      <div className="rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Accessories Inventory</p>
              <p className="text-xs text-muted-foreground">{accessories.length} products across all categories</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAccDetails(v => !v)}>
            {showAccDetails ? "Hide" : "View All"}
          </Button>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center p-2.5 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-foreground">{accessories.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Products</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-foreground">{totalAccQty}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Qty</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-amber-600">{lowStockAcc.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Low Stock</p>
            </div>
          </div>
          {outOfStockAcc.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {outOfStockAcc.length} item{outOfStockAcc.length !== 1 ? "s" : ""} out of stock
            </div>
          )}
          {showAccDetails && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto border border-border/40 rounded-lg">
              <div className="grid grid-cols-3 px-3 py-1.5 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-0">
                <span className="col-span-2">Product</span>
                <span className="text-right">In Stock</span>
              </div>
              {accessories.map(a => (
                <div key={a.id} className="grid grid-cols-3 px-3 py-2 border-t border-border/30 text-sm items-center">
                  <div className="col-span-2 min-w-0">
                    <p className="font-medium text-foreground truncate text-xs">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.category}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${
                      a.quantity === 0 ? "text-red-500" : a.quantity <= 5 ? "text-amber-600" : "text-emerald-600"
                    }`}>{a.quantity} pcs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PPF Rolls Card */}
      <div className="rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Layers className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">PPF Rolls Inventory</p>
              <p className="text-xs text-muted-foreground">{ppfs.length} brands · {totalPPFRolls} rolls</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPPFDetails(v => !v)}>
            {showPPFDetails ? "Hide" : "View All"}
          </Button>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center p-2.5 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-foreground">{ppfs.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Brands</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-foreground">{activeRolls.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Rolls</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-purple-600">{totalPPFSqft.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total sqft</p>
            </div>
          </div>
          {depletedRolls.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {depletedRolls.length} roll{depletedRolls.length !== 1 ? "s" : ""} ≤10 sqft remaining
            </div>
          )}
          {showPPFDetails && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto border border-border/40 rounded-lg">
              <div className="grid grid-cols-3 px-3 py-1.5 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-0">
                <span className="col-span-2">Brand / Roll</span>
                <span className="text-right">Stock</span>
              </div>
              {ppfs.map(ppf => (ppf.rolls ?? []).map(roll => (
                <div key={roll.id} className="grid grid-cols-3 px-3 py-2 border-t border-border/30 text-sm items-center">
                  <div className="col-span-2 min-w-0">
                    <p className="font-medium text-foreground truncate text-xs">{roll.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ppf.name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${
                      roll.stock <= 0 ? "text-red-500" : roll.stock <= 10 ? "text-amber-600" : "text-purple-600"
                    }`}>{roll.stock} sqft</span>
                  </div>
                </div>
              )))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CREATE RESELL DIALOG ──────────────────────────────────────────────────────
function CreateResellDialog({ open, onClose, accessories, ppfs }: {
  open: boolean; onClose: () => void;
  accessories: AccessoryMaster[]; ppfs: PPFMaster[];
}) {
  const { toast } = useToast();
  const [itemType, setItemType] = useState<"Accessory" | "PPF">("Accessory");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  // Accessory fields
  const [selectedAccessoryId, setSelectedAccessoryId] = useState("");
  const [quantity, setQuantity] = useState("");

  // PPF fields
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedRollId, setSelectedRollId] = useState("");
  const [sqft, setSqft] = useState("");

  // Common
  const [unitPrice, setUnitPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [notes, setNotes] = useState("");

  const selectedAccessory = accessories.find(a => a.id === selectedAccessoryId);
  const selectedBrand = ppfs.find(p => p.id === selectedBrandId);
  // Fix: only look up roll when a roll is actually selected
  const selectedRoll = selectedRollId ? selectedBrand?.rolls?.find(r => r.id === selectedRollId) : undefined;

  const qty = parseFloat(quantity) || 0;
  const sqftVal = parseFloat(sqft) || 0;
  const unitPriceVal = parseFloat(unitPrice) || 0;
  const totalAmountVal = parseFloat(totalAmount) || 0;

  const handleAccessorySelect = (id: string) => {
    setSelectedAccessoryId(id);
    const acc = accessories.find(a => a.id === id);
    if (acc) setUnitPrice(acc.price.toString());
  };

  const handleBrandSelect = (v: string) => {
    setSelectedBrandId(v);
    setSelectedRollId("");
    setSqft("");
  };

  const handleRollSelect = (rollId: string) => {
    setSelectedRollId(rollId);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/resell", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resell"] });
      queryClient.invalidateQueries({ queryKey: ["/api/masters/accessories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/masters/ppf"] });
      toast({ title: "Resell entry created successfully" });
      onClose();
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to create resell entry";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setItemType("Accessory"); setDate(new Date().toISOString().split("T")[0]);
    setBuyerName(""); setBuyerPhone("");
    setSelectedAccessoryId(""); setQuantity("");
    setSelectedBrandId(""); setSelectedRollId(""); setSqft("");
    setUnitPrice(""); setTotalAmount(""); setPaymentMode("Cash"); setNotes("");
  };

  const handleSubmit = () => {
    if (!buyerName.trim()) { toast({ title: "Buyer name is required", variant: "destructive" }); return; }
    if (!date) { toast({ title: "Date is required", variant: "destructive" }); return; }
    if (unitPriceVal < 0) { toast({ title: "Unit price cannot be negative", variant: "destructive" }); return; }

    if (itemType === "Accessory") {
      if (!selectedAccessoryId) { toast({ title: "Please select an accessory", variant: "destructive" }); return; }
      if (!qty || qty <= 0) { toast({ title: "Quantity must be greater than 0", variant: "destructive" }); return; }
      if (!Number.isInteger(qty)) { toast({ title: "Quantity must be a whole number", variant: "destructive" }); return; }
      if (selectedAccessory && qty > selectedAccessory.quantity) {
        toast({ title: `Insufficient stock. Available: ${selectedAccessory.quantity} pcs`, variant: "destructive" }); return;
      }
      mutation.mutate({
        date, buyerName, buyerPhone, itemType,
        accessoryId: selectedAccessoryId,
        accessoryName: selectedAccessory?.name ?? "",
        accessoryCategory: selectedAccessory?.category ?? "",
        quantity: qty,
        unitPrice: unitPriceVal,
        totalAmount: totalAmountVal || qty * unitPriceVal,
        paymentMode, notes,
      });
    } else {
      if (!selectedBrandId) { toast({ title: "Please select a PPF brand", variant: "destructive" }); return; }
      if (!selectedRollId) { toast({ title: "Please select a PPF roll", variant: "destructive" }); return; }
      if (!sqftVal || sqftVal <= 0) { toast({ title: "Sqft must be greater than 0", variant: "destructive" }); return; }
      if (selectedRoll && sqftVal > selectedRoll.stock) {
        toast({ title: `Insufficient stock. Available: ${selectedRoll.stock} sqft`, variant: "destructive" }); return;
      }
      if (!totalAmountVal || totalAmountVal <= 0) { toast({ title: "Total amount must be greater than 0", variant: "destructive" }); return; }
      mutation.mutate({
        date, buyerName, buyerPhone, itemType,
        ppfBrandId: selectedBrandId,
        ppfBrandName: selectedBrand?.name ?? "",
        ppfRollId: selectedRollId,
        ppfRollName: selectedRoll?.name ?? "",
        sqft: sqftVal,
        unitPrice: unitPriceVal,
        totalAmount: totalAmountVal,
        paymentMode, notes,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            New Resell Sale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Item Type */}
          <div className="space-y-1.5">
            <Label>Item Type <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Accessory", "PPF"] as const).map(t => (
                <button key={t} data-testid={`button-type-${t}`}
                  onClick={() => {
                    setItemType(t);
                    setSelectedAccessoryId(""); setSelectedBrandId(""); setSelectedRollId("");
                    setUnitPrice(""); setTotalAmount(""); setQuantity(""); setSqft("");
                  }}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all flex items-center gap-2
                    ${itemType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t === "Accessory" ? <Package className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                  {t === "Accessory" ? "Accessory" : "PPF Roll"}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input data-testid="input-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Buyer Phone</Label>
              <Input data-testid="input-buyer-phone" placeholder="9876543210" maxLength={10}
                value={buyerPhone} onChange={e => setBuyerPhone(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Buyer Name / Company <span className="text-destructive">*</span></Label>
            <Input data-testid="input-buyer-name" placeholder="Company or supplier name" value={buyerName}
              onChange={e => setBuyerName(e.target.value)} />
          </div>

          {/* Accessory Fields */}
          {itemType === "Accessory" && (
            <>
              <div className="space-y-1.5">
                <Label>Select Accessory <span className="text-destructive">*</span></Label>
                <Select value={selectedAccessoryId} onValueChange={handleAccessorySelect}>
                  <SelectTrigger data-testid="select-accessory">
                    <SelectValue placeholder="Choose an accessory…" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessories.length === 0 && (
                      <SelectItem value="_none" disabled>No accessories in inventory</SelectItem>
                    )}
                    {accessories.map(a => (
                      <SelectItem key={a.id} value={a.id!} disabled={a.quantity === 0}>
                        {a.name} ({a.category}) — {a.quantity} pcs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAccessory && (
                  <p className="text-xs text-muted-foreground">
                    Available: <span className={`font-semibold ${selectedAccessory.quantity <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                      {selectedAccessory.quantity} pcs
                    </span> · Master price: {formatCurrency(selectedAccessory.price)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity (pcs) <span className="text-destructive">*</span></Label>
                  <Input data-testid="input-quantity" type="number" min="1"
                    placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
                  {selectedAccessory && qty > selectedAccessory.quantity && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Exceeds available stock
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Price (₹) <span className="text-destructive">*</span></Label>
                  <Input data-testid="input-unit-price" type="number" min="0" placeholder="0"
                    value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Total Amount (₹) <span className="text-destructive">*</span></Label>
                <Input data-testid="input-total-amount" type="number" min="0" placeholder="Enter total amount"
                  value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
              </div>
            </>
          )}

          {/* PPF Fields */}
          {itemType === "PPF" && (
            <>
              <div className="space-y-1.5">
                <Label>PPF Brand <span className="text-destructive">*</span></Label>
                <Select value={selectedBrandId} onValueChange={handleBrandSelect}>
                  <SelectTrigger data-testid="select-ppf-brand">
                    <SelectValue placeholder="Select brand…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ppfs.length === 0 && <SelectItem value="_none" disabled>No PPF brands found</SelectItem>}
                    {ppfs.map(p => (
                      <SelectItem key={p.id} value={p.id!}>
                        {p.name} ({p.rolls?.length ?? 0} rolls)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBrandId && (
                <div className="space-y-1.5">
                  <Label>PPF Roll <span className="text-destructive">*</span></Label>
                  <Select value={selectedRollId || undefined} onValueChange={handleRollSelect}>
                    <SelectTrigger data-testid="select-ppf-roll">
                      <SelectValue placeholder="Select roll…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedBrand?.rolls ?? []).length === 0 && (
                        <SelectItem value="_none" disabled>No rolls in this brand</SelectItem>
                      )}
                      {(selectedBrand?.rolls ?? []).map(r => (
                        <SelectItem key={r.id} value={r.id!} disabled={r.stock <= 0}>
                          {r.name} — {r.stock} sqft
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRoll && (
                    <p className="text-xs text-muted-foreground">
                      Available: <span className={`font-semibold ${selectedRoll.stock <= 10 ? "text-amber-600" : "text-purple-600"}`}>
                        {selectedRoll.stock} sqft
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Sqft to sell <span className="text-destructive">*</span></Label>
                  <Input data-testid="input-sqft" type="number" min="0.1" step="0.1"
                    placeholder="0.0" value={sqft} onChange={e => setSqft(e.target.value)}
                    className={selectedRoll && sqftVal > selectedRoll.stock ? "border-destructive focus-visible:ring-destructive" : ""} />
                  {selectedRoll && sqftVal > selectedRoll.stock && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Exceeds available stock ({selectedRoll.stock} sqft)
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Price (₹) <span className="text-destructive">*</span></Label>
                  <Input data-testid="input-unit-price" type="number" min="0" placeholder="0"
                    value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Total Amount (₹) <span className="text-destructive">*</span></Label>
                <Input data-testid="input-total-amount" type="number" min="0" placeholder="Enter total amount"
                  value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
              </div>
            </>
          )}

          {/* Payment Mode */}
          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger data-testid="select-payment-mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input data-testid="input-notes" placeholder="Any additional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <Button data-testid="button-create-resell" onClick={handleSubmit} disabled={mutation.isPending}
            className="w-full bg-primary hover:bg-primary/90">
            {mutation.isPending ? "Creating entry…" : "Create Resell Sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── EDIT RESELL DIALOG ────────────────────────────────────────────────────────
function EditResellDialog({ order, onClose }: { order: ResellOrder | null; onClose: () => void }) {
  const { toast } = useToast();
  const [date, setDate] = useState(order?.date ?? "");
  const [buyerName, setBuyerName] = useState(order?.buyerName ?? "");
  const [buyerPhone, setBuyerPhone] = useState(order?.buyerPhone ?? "");
  const [quantity, setQuantity] = useState(order?.quantity?.toString() ?? "");
  const [sqft, setSqft] = useState(order?.sqft?.toString() ?? "");
  const [unitPrice, setUnitPrice] = useState(order?.unitPrice?.toString() ?? "");
  const [totalAmount, setTotalAmount] = useState(order?.totalAmount?.toString() ?? "");
  const [paymentMode, setPaymentMode] = useState(order?.paymentMode ?? "Cash");
  const [notes, setNotes] = useState(order?.notes ?? "");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/resell/${order?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resell"] });
      toast({ title: "Resell entry updated successfully" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Failed to update entry", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!buyerName.trim()) { toast({ title: "Buyer name is required", variant: "destructive" }); return; }
    if (!date) { toast({ title: "Date is required", variant: "destructive" }); return; }
    const totalVal = parseFloat(totalAmount) || 0;
    if (totalVal <= 0) { toast({ title: "Total amount must be greater than 0", variant: "destructive" }); return; }

    const payload: any = {
      date, buyerName, buyerPhone,
      unitPrice: parseFloat(unitPrice) || 0,
      totalAmount: totalVal,
      paymentMode, notes,
    };
    if (order?.itemType === "Accessory") {
      payload.quantity = parseInt(quantity) || 0;
    } else {
      payload.sqft = parseFloat(sqft) || 0;
    }
    mutation.mutate(payload);
  };

  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Edit Resell Sale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Read-only item info */}
          <div className="rounded-lg bg-muted/30 border border-border/40 px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Item (read-only)</p>
            {order.itemType === "Accessory" ? (
              <p className="text-sm font-semibold text-foreground">{order.accessoryName}
                <span className="text-xs text-muted-foreground font-normal ml-1">({order.accessoryCategory})</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-foreground">{order.ppfRollName}
                <span className="text-xs text-muted-foreground font-normal ml-1">· {order.ppfBrandName}</span>
              </p>
            )}
          </div>

          {/* Date + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input data-testid="edit-input-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Buyer Phone</Label>
              <Input data-testid="edit-input-phone" placeholder="9876543210" maxLength={10}
                value={buyerPhone} onChange={e => setBuyerPhone(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Buyer Name / Company <span className="text-destructive">*</span></Label>
            <Input data-testid="edit-input-buyer" placeholder="Company or supplier name" value={buyerName}
              onChange={e => setBuyerName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {order.itemType === "Accessory" ? (
              <div className="space-y-1.5">
                <Label>Quantity (pcs) <span className="text-destructive">*</span></Label>
                <Input data-testid="edit-input-qty" type="number" min="1" placeholder="0"
                  value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Sqft to sell <span className="text-destructive">*</span></Label>
                <Input data-testid="edit-input-sqft" type="number" min="0.1" step="0.1" placeholder="0.0"
                  value={sqft} onChange={e => setSqft(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{order.itemType === "Accessory" ? "Unit Price (₹)" : "Price per sqft (₹)"} <span className="text-destructive">*</span></Label>
              <Input data-testid="edit-input-price" type="number" min="0" placeholder="0"
                value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Total Amount (₹) <span className="text-destructive">*</span></Label>
            <Input data-testid="edit-input-total" type="number" min="0" placeholder="Enter total amount"
              value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger data-testid="edit-select-payment"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input data-testid="edit-input-notes" placeholder="Any additional notes…" value={notes}
              onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button data-testid="button-save-edit" onClick={handleSubmit} disabled={mutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90">
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ResellPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<ResellOrder | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<ResellOrder[]>({
    queryKey: ["/api/resell"],
  });
  const { data: accessories = [], isLoading: accLoading } = useQuery<AccessoryMaster[]>({
    queryKey: ["/api/masters/accessories"],
  });
  const { data: ppfs = [], isLoading: ppfLoading } = useQuery<PPFMaster[]>({
    queryKey: ["/api/masters/ppf"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resell/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resell"] });
      toast({ title: "Resell entry deleted" });
    },
    onError: () => toast({ title: "Failed to delete entry", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o => {
      const matchSearch = !q ||
        o.buyerName.toLowerCase().includes(q) ||
        (o.buyerPhone ?? "").includes(q) ||
        (o.accessoryName ?? "").toLowerCase().includes(q) ||
        (o.ppfBrandName ?? "").toLowerCase().includes(q) ||
        (o.ppfRollName ?? "").toLowerCase().includes(q);
      const matchType = filterType === "all" || o.itemType === filterType;
      const matchPayment = filterPayment === "all" || o.paymentMode === filterPayment;
      return matchSearch && matchType && matchPayment;
    });
  }, [orders, search, filterType, filterPayment]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Resell</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sell accessories and PPF rolls to other companies and suppliers
            </p>
          </div>
          <Button data-testid="button-new-resell" onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />New Resell Sale
          </Button>
        </div>

        {/* Inventory Overview */}
        {(accLoading || ppfLoading) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl border border-border/60 bg-background h-36 animate-pulse" />
            ))}
          </div>
        ) : (
          <InventoryOverview accessories={accessories} ppfs={ppfs} />
        )}

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Sales", value: orders.length, sub: "all time", icon: ShoppingCart, color: "bg-blue-100 text-blue-600" },
              { label: "Total Revenue", value: formatCurrency(orders.reduce((s, o) => s + o.totalAmount, 0)), sub: "all time", icon: IndianRupee, color: "bg-emerald-100 text-emerald-600" },
              { label: "Accessory Sales", value: orders.filter(o => o.itemType === "Accessory").length, sub: "entries", icon: Package, color: "bg-orange-100 text-orange-600" },
              { label: "PPF Sales", value: orders.filter(o => o.itemType === "PPF").length, sub: "entries", icon: Layers, color: "bg-purple-100 text-purple-600" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-background px-4 py-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input data-testid="input-search" placeholder="Search buyer, product, phone…"
              className="pl-10" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="Accessory">Accessories</SelectItem>
              <SelectItem value="PPF">PPF Rolls</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={v => { setFilterPayment(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterType !== "all" || filterPayment !== "all") && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
              onClick={() => { setSearch(""); setFilterType("all"); setFilterPayment("all"); setPage(1); }}>
              <X className="h-3.5 w-3.5 mr-1" />Clear
            </Button>
          )}
        </div>

        {/* Orders Table */}
        <div className="rounded-xl border border-border/60 overflow-hidden bg-background shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="col-span-1">Date</span>
            <span className="col-span-2">Buyer</span>
            <span className="col-span-1">Type</span>
            <span className="col-span-3">Item</span>
            <span className="col-span-1">Qty/Sqft</span>
            <span className="col-span-1">Unit Price</span>
            <span className="col-span-2">Total</span>
            <span className="col-span-1 text-right">Action</span>
          </div>

          {ordersLoading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading orders…</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 opacity-25" />
              <p className="text-base font-medium">
                {orders.length === 0 ? "No resell entries yet" : "No entries match your filters"}
              </p>
              {orders.length === 0 && (
                <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Create First Sale
                </Button>
              )}
            </div>
          ) : (
            paginated.map((order, i) => (
              <div key={order.id}
                data-testid={`row-resell-${order.id}`}
                className={`grid grid-cols-12 gap-2 px-5 py-3.5 items-center text-sm
                  ${i < paginated.length - 1 ? "border-b border-border/40" : ""}`}>

                {/* Date */}
                <div className="col-span-1 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(order.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                </div>

                {/* Buyer */}
                <div className="col-span-2 min-w-0">
                  <p className="font-medium text-foreground truncate text-xs">{order.buyerName}</p>
                  {order.buyerPhone && <p className="text-[10px] text-muted-foreground">{order.buyerPhone}</p>}
                </div>

                {/* Type Badge */}
                <div className="col-span-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    order.itemType === "Accessory"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {order.itemType === "Accessory" ? "ACC" : "PPF"}
                  </span>
                </div>

                {/* Item Name */}
                <div className="col-span-3 min-w-0">
                  {order.itemType === "Accessory" ? (
                    <>
                      <p className="font-medium text-foreground truncate text-xs">{order.accessoryName}</p>
                      <p className="text-[10px] text-muted-foreground">{order.accessoryCategory}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground truncate text-xs">{order.ppfRollName}</p>
                      <p className="text-[10px] text-muted-foreground">{order.ppfBrandName}</p>
                    </>
                  )}
                </div>

                {/* Qty / Sqft */}
                <div className="col-span-1 text-xs font-semibold text-foreground">
                  {order.itemType === "Accessory"
                    ? `${order.quantity} pcs`
                    : `${order.sqft} sqft`}
                </div>

                {/* Unit Price */}
                <div className="col-span-1 text-xs text-muted-foreground">
                  {formatCurrency(order.unitPrice)}
                  {order.itemType === "PPF" && <span className="text-[9px]">/sqft</span>}
                </div>

                {/* Total + Payment */}
                <div className="col-span-2">
                  <p className="font-bold text-sm text-foreground">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-[10px] text-muted-foreground">{order.paymentMode}</p>
                </div>

                {/* Actions — always visible */}
                <div className="col-span-1 flex justify-end items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    data-testid={`button-edit-${order.id}`}
                    onClick={() => setEditOrder(order)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    data-testid={`button-delete-${order.id}`}
                    onClick={() => { if (confirm("Delete this resell entry?")) deleteMutation.mutate(order.id!); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}

          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>

      <CreateResellDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accessories={accessories}
        ppfs={ppfs}
      />

      <EditResellDialog
        key={editOrder?.id ?? "edit-closed"}
        order={editOrder}
        onClose={() => setEditOrder(null)}
      />
    </Layout>
  );
}
