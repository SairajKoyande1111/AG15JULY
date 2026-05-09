import { Layout } from "@/components/layout/layout";
import { useQuery } from "@tanstack/react-query";
import { JobCard, Inquiry, Invoice } from "@shared/schema";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  History, 
  Clock, 
  MessageSquare,
  ArrowLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";

export default function CustomerDetailPage() {
  const { phone } = useParams<{ phone: string }>();
  const [, setLocation] = useLocation();
  
  const createNewJobForCustomer = (customerPhone: string, customerName: string, customerEmail?: string, previousVehicles?: any[]) => {
    const params = new URLSearchParams();
    params.set('phone', customerPhone);
    params.set('name', customerName);
    if (customerEmail) {
      params.set('email', customerEmail);
    }
    if (previousVehicles && previousVehicles.length > 0) {
      params.set('vehicles', JSON.stringify(previousVehicles));
    }
    setLocation(`/add-job?${params.toString()}`);
  };

  const decodedPhone = useMemo(() => decodeURIComponent(phone || ""), [phone]);

  const { data: jobCards = [], isLoading: jobsLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries"],
    enabled: !!phone,
  });

  const { data: customerInvoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: [`/api/invoices?phone=${encodeURIComponent(decodedPhone)}`],
    enabled: !!decodedPhone,
  });

  const customerData = useMemo(() => {
    if (!phone) return null;

    const decodedPhone = decodeURIComponent(phone);
    const customerJobs = jobCards.filter(j => j.phoneNumber === decodedPhone);
    
    // First find any job card to get the standard name if available
    const latestJobForName = [...customerJobs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const standardName = latestJobForName?.customerName;

    const customerInquiries = inquiries.filter(i => {
      const phoneMatch = i.phone === decodedPhone;
      const nameMatch = standardName && i.customerName?.toLowerCase() === standardName.toLowerCase();
      return phoneMatch || nameMatch;
    });

    if (customerJobs.length === 0 && customerInquiries.length === 0) return null;

    // Use latest job card for basic info
    const latestJob = [...customerJobs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const latestInquiry = [...customerInquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const name = latestJob?.customerName || latestInquiry?.customerName || "Unknown";
    const email = latestJob?.emailAddress || latestInquiry?.email || "";

    // Further refinement: If same name and number exists in DB, we should have them already via filter.
    // The prompt mentions "if a inquiry with same name and number exist in the DB then show it here"
    // Our filter already handles the phone number. If there are multiple names for same phone, 
    // we might want to consolidate or filter by both if possible, but phone is the primary identifier here.

    const totalSpent = customerJobs.reduce((sum, job) => sum + (job.estimatedCost || 0), 0);
    const completedJobs = customerJobs.filter(j => j.status === "Completed").length;
    const pendingJobs = customerJobs.filter(j => j.status === "Pending" || j.status === "In Progress").length;

    // Unique vehicles
    const vehiclesMap = new Map();
    customerJobs.forEach(j => {
      const key = `${j.make}-${j.model}-${j.licensePlate}`;
      if (!vehiclesMap.has(key)) {
        vehiclesMap.set(key, {
          make: j.make,
          model: j.model,
          year: j.year,
          plate: j.licensePlate,
          type: j.vehicleType
        });
      }
    });

    return {
      name,
      phone: decodedPhone,
      email,
      since: latestJob?.date || latestInquiry?.createdAt,
      totalSpent,
      completedJobs,
      pendingJobs,
      totalJobs: customerJobs.length,
      vehicles: Array.from(vehiclesMap.values()),
      history: customerJobs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      inquiries: customerInquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      invoices: customerInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [phone, jobCards, inquiries, customerInvoices]);

  if (jobsLoading || inquiriesLoading || invoicesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Clock className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!customerData) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p>Customer not found</p>
          <Button variant="ghost" onClick={() => setLocation("/customers")}>Back to Customers</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-primary">
                {customerData.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{customerData.name}</h1>
                <p className="text-sm text-slate-500">
                  Customer since {new Date(customerData.since!).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setLocation(`/add-job?phone=${encodeURIComponent(customerData.phone)}`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <History className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Jobs</p>
                  <p className="text-xl font-bold">{customerData.totalJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Completed</p>
                  <p className="text-xl font-bold">{customerData.completedJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <span className="text-red-600 font-bold">₹</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Spent</p>
                  <p className="text-xl font-bold">₹{customerData.totalSpent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Pending</p>
                  <p className="text-xl font-bold">{customerData.pendingJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{customerData.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{customerData.email || "No email provided"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vehicles ({customerData.vehicles.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerData.vehicles.map((v, i) => (
                  <div key={i} className="flex flex-col border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-red-600" />
                      <span className="font-semibold text-sm">{v.year} {v.make} {v.model}</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6 uppercase">{v.plate}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0">
                <Tabs defaultValue="history" className="w-full">
                  <div className="border-b px-4">
                    <TabsList className="bg-transparent h-12 gap-4">
                      <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2">Service History</TabsTrigger>
                      <TabsTrigger value="inquiries" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2">Inquiries</TabsTrigger>
                      <TabsTrigger value="invoices" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2">Invoices</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="history" className="p-4 space-y-4 m-0">
                    {customerData.history.map((job) => (
                      <div key={job.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-red-600">{job.jobNo}</span>
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                              {job.status}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-slate-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-sm">{job.year} {job.make} {job.model}</h4>
                            <p className="text-xs text-slate-500">{job.licensePlate}</p>
                            <p className="text-sm font-bold mt-1 text-red-600">
                              {job.services.length > 0 ? job.services[0].name : "General Service"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">₹{job.estimatedCost}</p>
                            <button 
                              className="text-xs text-red-600 font-semibold flex items-center gap-1 ml-auto mt-1 hover:underline"
                              onClick={() => setLocation(`/job-cards/${job.id}`)}
                            >
                              View <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customerData.history.length === 0 && (
                      <p className="text-center py-8 text-slate-500">No service history found</p>
                    )}
                  </TabsContent>
                  <TabsContent value="inquiries" className="p-4 space-y-4 m-0">
                    {customerData.inquiries.map((inq) => (
                      <div key={inq.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-red-600">{inq.inquiryId}</span>
                            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                              {inq.status}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-slate-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(inq.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            {inq.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                "{inq.notes}"
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <button 
                              className="text-xs text-red-600 font-semibold flex items-center gap-1 ml-auto mt-1 hover:underline"
                              onClick={() => setLocation("/inquiry")}
                            >
                              View <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customerData.inquiries.length === 0 && (
                      <p className="text-center py-8 text-slate-500">No inquiries found</p>
                    )}
                  </TabsContent>
                  <TabsContent value="invoices" className="p-4 space-y-4 m-0">
                    {customerData.invoices.map((inv) => (
                      <div key={inv.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-red-600">{inv.invoiceNo}</span>
                            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                              {inv.business}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-slate-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(inv.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold">
                              {inv.items.length} Items
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {inv.items.slice(0, 2).map(item => item.name).join(", ")}
                              {inv.items.length > 2 ? "..." : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">₹{inv.totalAmount}</p>
                            <button 
                              className="text-xs text-red-600 font-semibold flex items-center gap-1 ml-auto mt-1 hover:underline"
                              onClick={() => setLocation(`/invoice/${inv.id}`)}
                            >
                              View <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customerData.invoices.length === 0 && (
                      <p className="text-center py-8 text-slate-500">No invoices found</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
