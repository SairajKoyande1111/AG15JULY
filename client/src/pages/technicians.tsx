import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, Wrench, Phone as PhoneIcon, Edit2, Trash2,
  IndianRupee, CalendarX, TrendingUp, ChevronRight, X,
  CheckCircle2, Clock, AlertCircle, ArrowUpRight
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Technician, TechnicianSalaryRecord, TechnicianAbsence, TechnicianIncrement } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function statusBadge(status: "paid" | "partial" | "unpaid") {
  if (status === "paid") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3"/>Paid</span>;
  if (status === "partial") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock className="h-3 w-3"/>Partial</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertCircle className="h-3 w-3"/>Unpaid</span>;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function TechniciansPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: [api.technicians.list.path],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/technicians/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.technicians.list.path] });
      toast({ title: "Technician deleted" });
    },
  });

  const filteredTechnicians = technicians
    .filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "specialty") return a.specialty.localeCompare(b.specialty);
      return 0;
    });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Technicians</h1>
            <p className="text-muted-foreground">Manage staff, salaries, absences and increments</p>
          </div>
          <Button data-testid="button-add-technician" onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />Add Technician
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input data-testid="input-search-technician" placeholder="Search by name or specialty..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="specialty">Sort by Specialty</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTechnicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Wrench className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">No technicians found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map((technician) => (
              <Card
                key={technician.id}
                data-testid={`card-technician-${technician.id}`}
                className="hover:shadow-md transition-all cursor-pointer hover:border-primary/40 group"
                onClick={() => setSelectedTechnician(technician)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-foreground truncate">{technician.name}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground">{technician.specialty}</p>
                      {technician.phone && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <PhoneIcon className="h-3 w-3" />{technician.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          technician.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>{technician.status === "active" ? "Active" : "Inactive"}</span>
                        {(technician.monthlySalary ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <IndianRupee className="h-3 w-3" />{formatCurrency(technician.monthlySalary ?? 0)}/mo
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 ml-2" onClick={e => e.stopPropagation()}>
                      <Button data-testid={`button-edit-technician-${technician.id}`} variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setEditingTechnician(technician)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button data-testid={`button-delete-technician-${technician.id}`} variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => {
                          if (confirm("Delete this technician?")) deleteMutation.mutate(technician.id!);
                        }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New Technician</DialogTitle></DialogHeader>
            <TechnicianForm onClose={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingTechnician} onOpenChange={(open) => !open && setEditingTechnician(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Technician</DialogTitle></DialogHeader>
            {editingTechnician && <TechnicianForm onClose={() => setEditingTechnician(null)} initialData={editingTechnician} />}
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        {selectedTechnician && (
          <TechnicianDetailSheet
            technician={selectedTechnician}
            onClose={() => setSelectedTechnician(null)}
          />
        )}
      </div>
    </Layout>
  );
}

// ─── TECHNICIAN FORM ─────────────────────────────────────────────────────────
function TechnicianForm({ onClose, initialData }: { onClose: () => void; initialData?: Technician }) {
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || "");
  const [specialty, setSpecialty] = useState(initialData?.specialty || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [status, setStatus] = useState<"active" | "inactive">(initialData?.status || "active");
  const [monthlySalary, setMonthlySalary] = useState(initialData?.monthlySalary?.toString() || "");
  const [joiningDate, setJoiningDate] = useState(initialData?.joiningDate || "");
  const [phoneError, setPhoneError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (initialData?.id) return apiRequest("PATCH", `/api/technicians/${initialData.id}`, data);
      return apiRequest("POST", api.technicians.create.path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.technicians.list.path] });
      toast({ title: initialData ? "Technician updated" : "Technician added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save technician", variant: "destructive" }),
  });

  const validatePhone = (value: string) => {
    if (!value) { setPhoneError(""); return true; }
    if (!/^\d+$/.test(value)) { setPhoneError("Digits only"); return false; }
    if (value.length !== 10) { setPhoneError("Must be 10 digits"); return false; }
    setPhoneError(""); return true;
  };

  const handleSubmit = () => {
    if (!name.trim() || !specialty.trim()) {
      toast({ title: "Error", description: "Name and Specialty are required", variant: "destructive" });
      return;
    }
    if (phone && !validatePhone(phone)) return;
    mutation.mutate({
      name, specialty,
      phone: phone || undefined,
      status,
      monthlySalary: monthlySalary ? parseFloat(monthlySalary) : 0,
      joiningDate: joiningDate || "",
    });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Name <span className="text-destructive">*</span></Label>
          <Input data-testid="input-technician-name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Specialty <span className="text-destructive">*</span></Label>
          <Input data-testid="input-technician-specialty" placeholder="e.g. Applicator, Detailer" value={specialty} onChange={e => setSpecialty(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input data-testid="input-technician-phone" placeholder="9876543210" value={phone} maxLength={10}
            onChange={e => { const v = e.target.value.replace(/\D/g, ""); setPhone(v); validatePhone(v); }}
            className={phoneError ? "border-destructive" : ""} />
          {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Monthly Salary (₹)</Label>
          <Input data-testid="input-technician-salary" type="number" placeholder="0" value={monthlySalary}
            onChange={e => setMonthlySalary(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Joining Date</Label>
          <Input data-testid="input-technician-joining-date" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between py-1">
        <Label>Status</Label>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${status === "inactive" ? "text-muted-foreground" : "text-muted-foreground/40"}`}>Inactive</span>
          <Switch checked={status === "active"} onCheckedChange={c => setStatus(c ? "active" : "inactive")} />
          <span className={`text-sm ${status === "active" ? "text-green-600 font-medium" : "text-muted-foreground/40"}`}>Active</span>
        </div>
      </div>
      <Button data-testid="button-save-technician" onClick={handleSubmit} disabled={mutation.isPending} className="w-full bg-primary hover:bg-primary/90 mt-2">
        {mutation.isPending ? "Saving..." : (initialData ? "Update Technician" : "Add Technician")}
      </Button>
    </div>
  );
}

// ─── DETAIL SHEET ─────────────────────────────────────────────────────────────
function TechnicianDetailSheet({ technician, onClose }: { technician: Technician; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"salary" | "absences" | "increments">("salary");

  const { data: salaryRecords = [] } = useQuery<TechnicianSalaryRecord[]>({
    queryKey: [`/api/technicians/${technician.id}/salary-records`],
  });
  const { data: absences = [] } = useQuery<TechnicianAbsence[]>({
    queryKey: [`/api/technicians/${technician.id}/absences`],
  });
  const { data: increments = [] } = useQuery<TechnicianIncrement[]>({
    queryKey: [`/api/technicians/${technician.id}/increments`],
  });

  const totalOutstanding = salaryRecords.reduce((s, r) => s + Math.max(0, r.salaryDue - r.paidAmount), 0);
  const thisMonthAbsences = absences.filter(a => {
    const d = new Date(a.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border z-10 px-6 pt-6 pb-4">
          <SheetHeader className="mb-0">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl font-bold">{technician.name}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{technician.specialty}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    technician.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>{technician.status === "active" ? "Active" : "Inactive"}</span>
                  {technician.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><PhoneIcon className="h-3 w-3"/>{technician.phone}</span>}
                  {technician.joiningDate && <span className="text-xs text-muted-foreground">Joined: {technician.joiningDate}</span>}
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Monthly Salary</p>
              <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(technician.monthlySalary ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Outstanding</p>
              <p className="text-base font-bold text-red-600 mt-0.5">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Absent This Month</p>
              <p className="text-base font-bold text-amber-700 mt-0.5">{thisMonthAbsences} day{thisMonthAbsences !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border border-border/60 rounded-lg p-1 bg-muted/30">
            {(["salary","absences","increments"] as const).map(tab => (
              <button key={tab} data-testid={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
                  activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab === "salary" && <IndianRupee className="h-3.5 w-3.5" />}
                {tab === "absences" && <CalendarX className="h-3.5 w-3.5" />}
                {tab === "increments" && <TrendingUp className="h-3.5 w-3.5" />}
                {tab === "salary" ? "Salary" : tab === "absences" ? "Absences" : "Increments"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-4">
          {activeTab === "salary" && <SalaryTab technician={technician} records={salaryRecords} />}
          {activeTab === "absences" && <AbsencesTab technician={technician} absences={absences} />}
          {activeTab === "increments" && <IncrementsTab technician={technician} increments={increments} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── SALARY TAB ───────────────────────────────────────────────────────────────
function SalaryTab({ technician, records }: { technician: Technician; records: TechnicianSalaryRecord[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [payingRecord, setPayingRecord] = useState<TechnicianSalaryRecord | null>(null);

  const now = new Date();
  const [formMonth, setFormMonth] = useState(now.getMonth() + 1);
  const [formYear, setFormYear] = useState(now.getFullYear());
  const [formSalary, setFormSalary] = useState(technician.monthlySalary?.toString() || "");
  const [formNotes, setFormNotes] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(now.toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("Cash");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/technicians/${technician.id}/salary-records`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/salary-records`] });
      toast({ title: "Salary record created" });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/technicians/${technician.id}/salary-records/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/salary-records`] });
      toast({ title: "Payment recorded" });
      setPayingRecord(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/technicians/${technician.id}/salary-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/salary-records`] });
      toast({ title: "Record deleted" });
    },
  });

  const handleCreate = () => {
    if (!formSalary) return;
    createMutation.mutate({
      month: formMonth, year: formYear,
      baseSalary: parseFloat(formSalary),
      salaryDue: parseFloat(formSalary),
      payments: [], notes: formNotes,
    });
  };

  const handlePayment = (record: TechnicianSalaryRecord) => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    const newPayments = [...(record.payments || []), { amount: amt, date: payDate, method: payMethod, notes: "" }];
    const newPaid = newPayments.reduce((s, p) => s + p.amount, 0);
    updateMutation.mutate({ id: record.id!, data: { payments: newPayments, paidAmount: newPaid, salaryDue: record.salaryDue } });
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Salary Records</h3>
        <Button data-testid="button-add-salary-record" size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" />{showForm ? "Cancel" : "Add Record"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Monthly Record</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Select value={formMonth.toString()} onValueChange={v => setFormMonth(parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={(i+1).toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Select value={formYear.toString()} onValueChange={v => setFormYear(parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Salary Due (₹)</Label>
              <Input data-testid="input-salary-due" className="h-9 text-sm" type="number" placeholder="0"
                value={formSalary} onChange={e => setFormSalary(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Input className="h-9 text-sm" placeholder="e.g. includes bonus" value={formNotes} onChange={e => setFormNotes(e.target.value)} />
          </div>
          <Button data-testid="button-create-salary-record" size="sm" className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Create Record"}
          </Button>
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <IndianRupee className="h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm">No salary records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const balance = Math.max(0, record.salaryDue - record.paidAmount);
            return (
              <div key={record.id} className="rounded-xl border border-border/60 bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{MONTHS[record.month - 1]} {record.year}</span>
                    {statusBadge(record.paymentStatus)}
                  </div>
                  <div className="flex items-center gap-1">
                    {record.paymentStatus !== "paid" && (
                      <Button data-testid={`button-record-payment-${record.id}`} size="sm" variant="outline" className="h-7 text-xs border-primary text-primary hover:bg-primary hover:text-white"
                        onClick={() => { setPayingRecord(record); setPayAmount(""); }}>
                        Record Payment
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      if (confirm("Delete this record?")) deleteMutation.mutate(record.id!);
                    }}><X className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border/40 text-sm">
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Salary Due</p>
                    <p className="font-semibold text-foreground">{formatCurrency(record.salaryDue)}</p>
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Paid</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(record.paidAmount)}</p>
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Balance</p>
                    <p className={`font-semibold ${balance > 0 ? "text-red-500" : "text-foreground"}`}>{formatCurrency(balance)}</p>
                  </div>
                </div>
                {(record.payments || []).length > 0 && (
                  <div className="border-t border-border/40 px-4 py-2 bg-muted/20 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment History</p>
                    {record.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.date} · {p.method}</span>
                        <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {record.notes && (
                  <div className="border-t border-border/40 px-4 py-1.5">
                    <p className="text-xs text-muted-foreground italic">{record.notes}</p>
                  </div>
                )}

                {/* Inline payment form */}
                {payingRecord?.id === record.id && (
                  <div className="border-t border-primary/20 bg-primary/5 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">Record Payment — Balance: {formatCurrency(balance)}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Amount (₹)</Label>
                        <Input data-testid="input-payment-amount" className="h-9 text-sm" type="number" placeholder="0"
                          value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Input data-testid="input-payment-date" className="h-9 text-sm" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Method</Label>
                        <Select value={payMethod} onValueChange={setPayMethod}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Cash","UPI","Bank Transfer","Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button data-testid="button-confirm-payment" size="sm" className="bg-primary hover:bg-primary/90"
                        onClick={() => handlePayment(record)} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Confirm Payment"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPayingRecord(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ABSENCES TAB ─────────────────────────────────────────────────────────────
function AbsencesTab({ technician, absences }: { technician: Technician; absences: TechnicianAbsence[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split("T")[0]);
  const [absenceReason, setAbsenceReason] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/technicians/${technician.id}/absences`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/absences`] });
      toast({ title: "Absence marked" });
      setShowForm(false); setAbsenceReason("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/technicians/${technician.id}/absences/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/absences`] }),
  });

  // Group absences by month/year
  const grouped: Record<string, TechnicianAbsence[]> = {};
  for (const a of absences) {
    const d = new Date(a.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Absences</h3>
        <Button data-testid="button-mark-absent" size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" />{showForm ? "Cancel" : "Mark Absent"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Absence</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input data-testid="input-absence-date" className="h-9 text-sm" type="date" value={absenceDate} onChange={e => setAbsenceDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason (optional)</Label>
              <Input data-testid="input-absence-reason" className="h-9 text-sm" placeholder="e.g. Sick leave" value={absenceReason} onChange={e => setAbsenceReason(e.target.value)} />
            </div>
          </div>
          <Button data-testid="button-confirm-absence" size="sm" className="bg-primary hover:bg-primary/90"
            onClick={() => createMutation.mutate({ date: absenceDate, reason: absenceReason })}
            disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Mark Absent"}
          </Button>
        </div>
      )}

      {absences.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <CalendarX className="h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm">No absences recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([monthLabel, monthAbsences]) => (
            <div key={monthLabel} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{monthLabel}</p>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  {monthAbsences.length} absence{monthAbsences.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1.5">
                {monthAbsences.map(absence => (
                  <div key={absence.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 bg-background">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-red-50 border border-red-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-red-600">{new Date(absence.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(absence.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        {absence.reason && <p className="text-xs text-muted-foreground">{absence.reason}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                      onClick={() => deleteMutation.mutate(absence.id!)}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INCREMENTS TAB ───────────────────────────────────────────────────────────
function IncrementsTab({ technician, increments }: { technician: Technician; increments: TechnicianIncrement[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newSalary, setNewSalary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/technicians/${technician.id}/increments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/increments`] });
      queryClient.invalidateQueries({ queryKey: [api.technicians.list.path] });
      toast({ title: "Salary increment recorded" });
      setShowForm(false); setNewSalary(""); setNotes("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/technicians/${technician.id}/increments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/increments`] });
    },
  });

  const handleCreate = () => {
    const ns = parseFloat(newSalary);
    if (!ns || ns <= 0) { toast({ title: "Enter a valid salary", variant: "destructive" }); return; }
    createMutation.mutate({
      previousSalary: technician.monthlySalary ?? 0,
      newSalary: ns,
      effectiveDate,
      notes,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Salary Increments</h3>
        <Button data-testid="button-add-increment" size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" />{showForm ? "Cancel" : "Record Increment"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Increment</p>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Current salary:</span>
            <span className="font-semibold text-foreground">{formatCurrency(technician.monthlySalary ?? 0)}/mo</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">New Salary (₹)</Label>
              <Input data-testid="input-new-salary" className="h-9 text-sm" type="number" placeholder="0"
                value={newSalary} onChange={e => setNewSalary(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective From</Label>
              <Input data-testid="input-effective-date" className="h-9 text-sm" type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Input className="h-9 text-sm" placeholder="e.g. Annual increment" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button data-testid="button-confirm-increment" size="sm" className="bg-primary hover:bg-primary/90"
            onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Record Increment"}
          </Button>
        </div>
      )}

      {increments.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <TrendingUp className="h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm">No increments recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {increments.map(inc => {
            const diff = inc.newSalary - inc.previousSalary;
            const pct = inc.previousSalary > 0 ? ((diff / inc.previousSalary) * 100).toFixed(1) : "—";
            return (
              <div key={inc.id} className="rounded-xl border border-border/60 bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(inc.previousSalary)}</span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(inc.newSalary)}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">+{pct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Effective from {inc.effectiveDate}</p>
                      {inc.notes && <p className="text-xs text-muted-foreground italic">{inc.notes}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { if (confirm("Delete this increment?")) deleteMutation.mutate(inc.id!); }}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
