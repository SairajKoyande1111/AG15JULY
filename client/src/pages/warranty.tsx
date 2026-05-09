import { Layout } from "@/components/layout/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WarrantyFollowUp, JobCard } from "@shared/schema";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Trash2,
  X,
  CalendarIcon,
  Car,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addMonths, differenceInDays } from "date-fns";

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "dd MMM yyyy"); } catch { return dateStr; }
}

function DatePickerButton({
  value,
  onChange,
  placeholder = "Pick date",
  testId,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" data-testid={testId}
          className="h-9 w-full justify-start gap-2 text-sm font-normal bg-white hover:bg-slate-50">
          <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {value ? format(new Date(value + "T00:00:00"), "dd MMM yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected}
          onSelect={(date) => { onChange(date ? format(date, "yyyy-MM-dd") : ""); setOpen(false); }}
          initialFocus />
      </PopoverContent>
    </Popover>
  );
}

// Parse warranty period string to months
function warrantyToMonths(period: string): number {
  const lower = period.toLowerCase();
  const numMatch = lower.match(/(\d+)/);
  if (!numMatch) return 12;
  const num = parseInt(numMatch[1]);
  if (lower.includes("year")) return num * 12;
  if (lower.includes("month")) return num;
  return 12;
}

function getCheckupWindow(serviceDate: string, warrantyPeriod: string) {
  try {
    const months = warrantyToMonths(warrantyPeriod);
    const start = parseISO(serviceDate);
    const windowStart = addMonths(start, Math.floor(months * 0.65));
    const windowEnd = addMonths(start, Math.floor(months * 0.95));
    return { windowStart, windowEnd };
  } catch {
    return null;
  }
}

function getCheckupUrgency(fw: WarrantyFollowUp): "overdue" | "soon" | "upcoming" | "future" | "done" {
  if (fw.checkupStatus === "done") return "done";
  const win = getCheckupWindow(fw.serviceDate, fw.warrantyPeriod);
  if (!win) return "upcoming";
  const today = new Date();
  const daysToStart = differenceInDays(win.windowStart, today);
  const daysToEnd = differenceInDays(win.windowEnd, today);
  if (daysToEnd < 0) return "overdue";
  if (daysToStart <= 0) return "soon";
  if (daysToStart <= 30) return "upcoming";
  return "future";
}

const URGENCY_CONFIG = {
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle, iconColor: "text-red-500" },
  soon: { label: "Due Now", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock, iconColor: "text-orange-500" },
  upcoming: { label: "Coming Soon", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock, iconColor: "text-yellow-500" },
  future: { label: "Future", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock, iconColor: "text-slate-400" },
  done: { label: "Done", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2, iconColor: "text-green-500" },
};

const WARRANTY_PERIODS = [
  "6 Months", "1 Year", "2 Years", "3 Years", "5 Years",
  "1 Month", "3 Months", "Lifetime",
];

function AddFollowUpDialog({ onClose, jobCards }: { onClose: () => void; jobCards: JobCard[] }) {
  const { toast } = useToast();
  const [jobCardId, setJobCardId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState<"Service" | "PPF">("Service");
  const [warrantyPeriod, setWarrantyPeriod] = useState("1 Year");
  const [serviceDate, setServiceDate] = useState(todayStr());
  const [jobSearch, setJobSearch] = useState("");
  const [showJobList, setShowJobList] = useState(false);

  const selectedJob = jobCards.find(j => j.id === jobCardId);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.toLowerCase();
    return jobCards
      .filter(j =>
        j.customerName.toLowerCase().includes(q) ||
        j.jobNo.toLowerCase().includes(q) ||
        j.licensePlate.toLowerCase().includes(q) ||
        j.make.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [jobCards, jobSearch]);

  const serviceItems = useMemo(() => {
    if (!selectedJob) return [];
    const services = (selectedJob.services || []).filter(s => s.warranty).map(s => ({ name: s.name, type: "Service" as const }));
    const ppfs = (selectedJob.ppfs || []).filter(p => (p as any).warranty).map(p => ({ name: p.name, type: "PPF" as const }));
    return [...services, ...ppfs];
  }, [selectedJob]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/warranty-followups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warranty-followups"] });
      toast({ title: "Warranty follow-up added" });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to add", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!jobCardId) { toast({ title: "Select a job card", variant: "destructive" }); return; }
    if (!serviceName.trim()) { toast({ title: "Enter service name", variant: "destructive" }); return; }
    if (!serviceDate) { toast({ title: "Enter service date", variant: "destructive" }); return; }
    const job = jobCards.find(j => j.id === jobCardId);
    mutation.mutate({
      jobCardId,
      jobNo: job?.jobNo || "",
      customerName: job?.customerName || "",
      customerPhone: job?.phoneNumber || "",
      vehicleInfo: `${job?.year || ""} ${job?.make || ""} ${job?.model || ""}`.trim(),
      licensePlate: job?.licensePlate || "",
      serviceName: serviceName.trim(),
      serviceType,
      warrantyPeriod,
      serviceDate,
      checkupStatus: "pending",
      topupStatus: "pending",
    });
  };

  return (
    <div className="space-y-4 py-1">
      {/* Job Card picker */}
      <div className="space-y-1.5">
        <Label>Job Card *</Label>
        <div className="relative">
          <Input
            placeholder="Search customer name, job no, plate..."
            value={selectedJob ? `${selectedJob.jobNo} — ${selectedJob.customerName}` : jobSearch}
            onChange={(e) => { setJobSearch(e.target.value); setJobCardId(""); setShowJobList(true); }}
            onFocus={() => setShowJobList(true)}
            className="pr-8"
          />
          {selectedJob && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              onClick={() => { setJobCardId(""); setJobSearch(""); setServiceName(""); }}>
              <X className="h-4 w-4" />
            </button>
          )}
          {showJobList && !selectedJob && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filteredJobs.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No jobs found</div>
              ) : filteredJobs.map(j => (
                <button key={j.id} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0"
                  onClick={() => {
                    setJobCardId(j.id!);
                    setJobSearch("");
                    setShowJobList(false);
                    setServiceDate(j.date ? j.date.slice(0, 10) : todayStr());
                  }}>
                  <div className="font-medium text-sm">{j.customerName}</div>
                  <div className="text-xs text-muted-foreground">{j.jobNo} · {j.make} {j.model} · {j.licensePlate}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedJob && (
          <div className="text-xs text-muted-foreground bg-slate-50 rounded p-2 border">
            <span className="font-semibold">{selectedJob.make} {selectedJob.model}</span> · {selectedJob.licensePlate} · {fmtDate(selectedJob.date?.slice(0, 10))}
          </div>
        )}
      </div>

      {/* Quick pick service from job */}
      {serviceItems.length > 0 && (
        <div className="space-y-1.5">
          <Label>Quick Pick Service with Warranty</Label>
          <div className="flex flex-wrap gap-2">
            {serviceItems.map(item => (
              <button key={item.name + item.type}
                onClick={() => { setServiceName(item.name); setServiceType(item.type); }}
                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                  serviceName === item.name
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-slate-200 text-slate-700 hover:border-primary"
                }`}>
                {item.type === "PPF" ? "🛡️" : "🔧"} {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Service name + type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Service / PPF Name *</Label>
          <Input placeholder="e.g. Borophene Coating" value={serviceName} onChange={e => setServiceName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={serviceType} onValueChange={(v) => setServiceType(v as "Service" | "PPF")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="PPF">PPF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warranty period + service date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Warranty Period *</Label>
          <Select value={warrantyPeriod} onValueChange={setWarrantyPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WARRANTY_PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Service Date *</Label>
          <DatePickerButton value={serviceDate} onChange={setServiceDate} placeholder="Service date" />
        </div>
      </div>

      {/* Preview checkup window */}
      {serviceDate && warrantyPeriod && (
        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs">
          <p className="font-semibold text-blue-700 mb-1">Calculated Checkup Window</p>
          {(() => {
            const win = getCheckupWindow(serviceDate, warrantyPeriod);
            if (!win) return <p className="text-blue-600">—</p>;
            return (
              <p className="text-blue-600">
                {fmtDate(format(win.windowStart, "yyyy-MM-dd"))} → {fmtDate(format(win.windowEnd, "yyyy-MM-dd"))}
              </p>
            );
          })()}
          <p className="text-blue-500 mt-0.5">Top-up checkup window: 65–95% of warranty period</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Add Follow-up"}
        </Button>
      </div>
    </div>
  );
}

function MarkDoneDialog({
  followUp,
  field,
  onClose,
}: {
  followUp: WarrantyFollowUp;
  field: "checkup" | "topup";
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [doneDate, setDoneDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [topupStatus, setTopupStatus] = useState<"done" | "not_applicable">("done");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/warranty-followups/${followUp.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warranty-followups"] });
      toast({ title: field === "checkup" ? "Checkup marked done" : "Top-up marked done" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const handleSave = () => {
    if (field === "checkup") {
      mutation.mutate({ checkupStatus: "done", checkupDate: doneDate, checkupNotes: notes });
    } else {
      mutation.mutate({ topupStatus, topupDate: doneDate, topupNotes: notes });
    }
  };

  return (
    <div className="space-y-4 py-1">
      <div className="bg-slate-50 border rounded-md p-3 text-sm">
        <p className="font-semibold text-slate-800">{followUp.customerName}</p>
        <p className="text-muted-foreground text-xs">{followUp.vehicleInfo} · {followUp.serviceName}</p>
      </div>

      {field === "topup" && (
        <div className="space-y-1.5">
          <Label>Top-up Result</Label>
          <Select value={topupStatus} onValueChange={(v) => setTopupStatus(v as "done" | "not_applicable")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="done">Top-up Done ✓</SelectItem>
              <SelectItem value="not_applicable">Not Applicable (no top-up needed)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{field === "checkup" ? "Checkup Date" : "Date"}</Label>
        <DatePickerButton value={doneDate} onChange={setDoneDate} placeholder="Select date" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Input placeholder="Any observations..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

function FollowUpRow({ fw, onMarkCheckup, onMarkTopup, onDelete }: {
  fw: WarrantyFollowUp;
  onMarkCheckup: () => void;
  onMarkTopup: () => void;
  onDelete: () => void;
}) {
  const urgency = getCheckupUrgency(fw);
  const cfg = URGENCY_CONFIG[urgency];
  const UrgencyIcon = cfg.icon;
  const win = getCheckupWindow(fw.serviceDate, fw.warrantyPeriod);

  return (
    <TableRow className="hover:bg-slate-50/60">
      <TableCell>
        <div className="font-semibold text-slate-800 text-sm">{fw.customerName}</div>
        <div className="text-xs text-muted-foreground">{fw.customerPhone}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium text-slate-700">{fw.vehicleInfo}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{fw.licensePlate}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium">{fw.serviceName}</div>
        <Badge variant="outline" className={`text-[10px] mt-0.5 ${fw.serviceType === "PPF" ? "text-purple-700 bg-purple-50 border-purple-200" : "text-blue-700 bg-blue-50 border-blue-200"}`}>
          {fw.serviceType}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs font-semibold text-slate-700">{fw.warrantyPeriod}</div>
        <div className="text-[11px] text-muted-foreground">From {fmtDate(fw.serviceDate)}</div>
      </TableCell>
      <TableCell>
        <div className="text-[11px] text-slate-500">
          {win ? `${fmtDate(format(win.windowStart, "yyyy-MM-dd"))} →` : "—"}
          {win ? <br /> : ""}
          {win ? fmtDate(format(win.windowEnd, "yyyy-MM-dd")) : ""}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {/* Checkup status */}
          {fw.checkupStatus === "done" ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-xs text-green-700 font-medium">Checkup done {fw.checkupDate ? `(${fmtDate(fw.checkupDate)})` : ""}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                <UrgencyIcon className={`h-3 w-3 mr-1 ${cfg.iconColor}`} />
                Checkup {cfg.label}
              </Badge>
              <button onClick={onMarkCheckup} className="text-[11px] text-primary hover:underline font-medium">Mark Done</button>
            </div>
          )}
          {/* Top-up status */}
          {fw.topupStatus === "done" ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium">Top-up done {fw.topupDate ? `(${fmtDate(fw.topupDate)})` : ""}</span>
            </div>
          ) : fw.topupStatus === "not_applicable" ? (
            <div className="flex items-center gap-1.5">
              <X className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Top-up N/A</span>
            </div>
          ) : fw.checkupStatus === "done" ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600">Top-up Pending</Badge>
              <button onClick={onMarkTopup} className="text-[11px] text-primary hover:underline font-medium">Mark Done</button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">Top-up: awaiting checkup</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function WarrantyPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [markingItem, setMarkingItem] = useState<{ fw: WarrantyFollowUp; field: "checkup" | "topup" } | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: followUps = [], isLoading } = useQuery<WarrantyFollowUp[]>({
    queryKey: ["/api/warranty-followups"],
  });

  const { data: jobCards = [] } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/warranty-followups/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warranty-followups"] });
      toast({ title: "Follow-up deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let list = [...followUps];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.customerName.toLowerCase().includes(q) ||
        f.serviceName.toLowerCase().includes(q) ||
        f.vehicleInfo.toLowerCase().includes(q) ||
        f.licensePlate.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      list = list.filter(f => {
        const urgency = getCheckupUrgency(f);
        if (filterStatus === "active") return urgency !== "done" && urgency !== "future";
        if (filterStatus === "overdue") return urgency === "overdue";
        if (filterStatus === "done") return f.checkupStatus === "done" && (f.topupStatus === "done" || f.topupStatus === "not_applicable");
        if (filterStatus === "pending") return f.checkupStatus === "pending";
        return true;
      });
    }
    // Sort: overdue first, then soon, then upcoming, then future, then done
    const order = { overdue: 0, soon: 1, upcoming: 2, future: 3, done: 4 };
    list.sort((a, b) => (order[getCheckupUrgency(a)] ?? 5) - (order[getCheckupUrgency(b)] ?? 5));
    return list;
  }, [followUps, search, filterStatus]);

  // Summary counts
  const counts = useMemo(() => {
    const overdue = followUps.filter(f => getCheckupUrgency(f) === "overdue").length;
    const soon = followUps.filter(f => getCheckupUrgency(f) === "soon").length;
    const upcoming = followUps.filter(f => getCheckupUrgency(f) === "upcoming").length;
    const done = followUps.filter(f => f.checkupStatus === "done" && (f.topupStatus === "done" || f.topupStatus === "not_applicable")).length;
    return { overdue, soon, upcoming, done, total: followUps.length };
  }, [followUps]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Warranty Follow-ups
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Track checkups and top-ups for services with active warranties</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Follow-up
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-red-100 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-700">{counts.overdue}</p>
                  <p className="text-xs font-semibold text-red-500 uppercase">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-orange-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{counts.soon}</p>
                  <p className="text-xs font-semibold text-orange-500 uppercase">Due Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-100 bg-yellow-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{counts.upcoming}</p>
                  <p className="text-xs font-semibold text-yellow-500 uppercase">Coming Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{counts.done}</p>
                  <p className="text-xs font-semibold text-green-500 uppercase">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, service, vehicle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {(["all","active","overdue","pending","done"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                  filterStatus === s ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}>
                {s === "all" ? `All (${counts.total})` : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Shield className="h-12 w-12 text-slate-200" />
            <p className="text-muted-foreground font-medium">
              {search || filterStatus !== "all" ? "No results match your filters." : "No warranty follow-ups yet. Click \"Add Follow-up\" to start tracking."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold text-slate-700">Customer</TableHead>
                  <TableHead className="font-bold text-slate-700">Vehicle</TableHead>
                  <TableHead className="font-bold text-slate-700">Service / PPF</TableHead>
                  <TableHead className="font-bold text-slate-700">Warranty</TableHead>
                  <TableHead className="font-bold text-slate-700">Checkup Window</TableHead>
                  <TableHead className="font-bold text-slate-700">Status & Actions</TableHead>
                  <TableHead className="font-bold text-slate-700"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(fw => (
                  <FollowUpRow
                    key={fw.id}
                    fw={fw}
                    onMarkCheckup={() => setMarkingItem({ fw, field: "checkup" })}
                    onMarkTopup={() => setMarkingItem({ fw, field: "topup" })}
                    onDelete={() => { if (confirm("Delete this follow-up?")) deleteMutation.mutate(fw.id!); }}
                  />
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-3 border-t bg-slate-50 text-sm text-muted-foreground">
              {filtered.length} follow-up{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={open => !open && setIsAddOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Warranty Follow-up</DialogTitle>
          </DialogHeader>
          <AddFollowUpDialog onClose={() => setIsAddOpen(false)} jobCards={jobCards} />
        </DialogContent>
      </Dialog>

      {/* Mark Done Dialog */}
      <Dialog open={!!markingItem} onOpenChange={open => !open && setMarkingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {markingItem?.field === "checkup" ? "Mark Checkup Done" : "Mark Top-up Done"}
            </DialogTitle>
          </DialogHeader>
          {markingItem && (
            <MarkDoneDialog
              followUp={markingItem.fw}
              field={markingItem.field}
              onClose={() => setMarkingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
