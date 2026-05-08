import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Expense } from "@shared/schema";
import { useState, useMemo } from "react";
import {
  IndianRupee,
  Plus,
  Edit2,
  Trash2,
  TrendingDown,
  Calendar,
  Search,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function fmtINR(n: number) {
  return n.toLocaleString("en-IN");
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ExpenseForm({ onClose, initialData }: { onClose: () => void; initialData?: Expense }) {
  const { toast } = useToast();
  const today = todayStr();
  const [name, setName] = useState(initialData?.name || "");
  const [details, setDetails] = useState(initialData?.details || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [date, setDate] = useState(initialData?.date || today);
  const [category, setCategory] = useState(initialData?.category || "");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let res: Response;
      if (initialData?.id) {
        res = await apiRequest("PATCH", `/api/expenses/${initialData.id}`, data);
      } else {
        res = await apiRequest("POST", "/api/expenses", data);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.refetchQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: initialData ? "Expense updated" : "Expense added",
        description: `₹${parseFloat(price).toLocaleString("en-IN")} saved.`,
      });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error saving expense", description: err?.message || "Something went wrong.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (!price || isNaN(parseFloat(price))) {
      toast({ title: "Valid amount required", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date required", variant: "destructive" });
      return;
    }
    mutation.mutate({ name: name.trim(), details: details.trim(), price: parseFloat(price), date, category: category.trim() });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Expense Name *</Label>
        <Input data-testid="input-expense-name" placeholder="e.g. Electricity Bill" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Details <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
        <Input data-testid="input-expense-details" placeholder="e.g. Monthly electricity for workshop" value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Amount (₹) *</Label>
          <Input data-testid="input-expense-price" type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} min="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input data-testid="input-expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Category <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
        <Input data-testid="input-expense-category" placeholder="e.g. Utilities, Rent, Supplies" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button data-testid="btn-save-expense" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : initialData ? "Update Expense" : "Save Expense"}
        </Button>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/expenses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.refetchQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const today = todayStr();
  const thisMonth = thisMonthStr();

  const totalAll = useMemo(() => expenses.reduce((s, e) => s + (e.price || 0), 0), [expenses]);
  const totalToday = useMemo(() => expenses.filter(e => e.date === today).reduce((s, e) => s + (e.price || 0), 0), [expenses, today]);
  const totalThisMonth = useMemo(() => expenses.filter(e => (e.date || "").startsWith(thisMonth)).reduce((s, e) => s + (e.price || 0), 0), [expenses, thisMonth]);

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.details || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q)
      );
    }
    if (fromDate) {
      list = list.filter(e => (e.date || "") >= fromDate);
    }
    if (toDate) {
      list = list.filter(e => (e.date || "") <= toDate);
    }
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [expenses, searchQuery, fromDate, toDate]);

  const filteredTotal = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.price || 0), 0), [filteredExpenses]);

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
            <p className="text-muted-foreground mt-1">Track and manage your business expenses.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-expense" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm onClose={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">Today</span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-slate-900">₹{fmtINR(totalToday)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatDate(today)}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">This Month</span>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-slate-900">₹{fmtINR(totalThisMonth)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatMonthLabel(thisMonth)}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">Total All Time</span>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-primary">₹{fmtINR(totalAll)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, details, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-search-expenses"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* From date */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">From</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="pl-8 h-9 w-36 text-sm"
                data-testid="input-from-date"
              />
            </div>
          </div>

          {/* To date */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">To</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="pl-8 h-9 w-36 text-sm"
                data-testid="input-to-date"
              />
            </div>
          </div>

          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="text-xs text-slate-400 hover:text-slate-700 underline"
            >
              Clear
            </button>
          )}

          {(fromDate || toDate || searchQuery) && (
            <span className="text-xs text-primary font-semibold ml-auto">
              {filteredExpenses.length} result{filteredExpenses.length !== 1 ? "s" : ""} — ₹{fmtINR(filteredTotal)}
            </span>
          )}
        </div>

        {/* Expense Table */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
              <IndianRupee className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-muted-foreground font-medium">
              {searchQuery || fromDate || toDate ? "No expenses match your filters." : "No expenses yet. Click \"Add Expense\" to get started."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold text-slate-700">Date</TableHead>
                  <TableHead className="font-bold text-slate-700">Expense Name</TableHead>
                  <TableHead className="font-bold text-slate-700">Category</TableHead>
                  <TableHead className="font-bold text-slate-700">Details</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Amount</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-slate-50/60" data-testid={`expense-row-${expense.id}`}>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{expense.name}</TableCell>
                    <TableCell>
                      {expense.category ? (
                        <Badge variant="secondary" className="text-[11px] bg-slate-100 text-slate-600 font-medium">
                          {expense.category}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {expense.details || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                      ₹{fmtINR(expense.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingExpense(expense)}
                          data-testid={`btn-edit-expense-${expense.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this expense?")) deleteMutation.mutate(expense.id!);
                          }}
                          data-testid={`btn-delete-expense-${expense.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Table footer totals */}
            <div className="flex justify-between items-center px-4 py-3 border-t bg-slate-50">
              <span className="text-sm text-muted-foreground">
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
              </span>
              <span className="font-bold text-slate-800">
                Total: ₹{fmtINR(filteredTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>
            {editingExpense && (
              <ExpenseForm onClose={() => setEditingExpense(null)} initialData={editingExpense} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
