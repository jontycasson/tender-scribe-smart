import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, FileText, Calendar, Building2, Settings, Upload } from "lucide-react";

// Mock data for demonstration
const recentTenders = [
  {
    id: 1,
    title: "City Infrastructure Project",
    status: "In Progress",
    deadline: "2024-02-15",
    value: "$2.5M",
    submittedAt: "2024-01-20",
  },
  {
    id: 2,
    title: "Software Development Services",
    status: "Submitted",
    deadline: "2024-01-30",
    value: "$150K",
    submittedAt: "2024-01-18",
  },
  {
    id: 3,
    title: "Environmental Assessment",
    status: "Draft",
    deadline: "2024-02-20",
    value: "$75K",
    submittedAt: null,
  },
];

const companyProfile = {
  name: "TechFlow Solutions",
  industry: "IT & Technology",
  teamSize: "21-50 employees",
  yearsInBusiness: "6-10 years",
  services: ["Software Development", "Consulting", "Project Management"],
  mission: "To deliver innovative technology solutions that drive business growth and efficiency.",
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("tenders");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "In Progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">TenderFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Tender
              </Button>
              <Avatar>
                <AvatarFallback>TS</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your tenders and company profile
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="tenders">Recent Tenders</TabsTrigger>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="tenders" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Recent Tenders</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Tender Response
                </Button>
              </div>

              <div className="grid gap-4">
                {recentTenders.map((tender) => (
                  <Card key={tender.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tender.title}</CardTitle>
                        <Badge className={getStatusColor(tender.status)}>
                          {tender.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Value</p>
                          <p className="font-medium">{tender.value}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deadline</p>
                          <p className="font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {tender.deadline}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submitted</p>
                          <p className="font-medium">
                            {tender.submittedAt || "Not submitted"}
                          </p>
                        </div>
                        <div className="flex items-end">
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Company Profile</h3>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Company Name</p>
                      <p className="font-medium">{companyProfile.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{companyProfile.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Team Size</p>
                      <p className="font-medium">{companyProfile.teamSize}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Years in Business</p>
                      <p className="font-medium">{companyProfile.yearsInBusiness}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Services Offered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {companyProfile.services.map((service) => (
                        <Badge key={service} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Mission Statement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{companyProfile.mission}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;