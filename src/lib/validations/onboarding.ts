import { z } from "zod";

export const companyProfileSchema = z.object({
  // Step 1: Basic Information
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().min(1, "Please select an industry"),
  teamSize: z.string().min(1, "Please select team size"),
  
  // Step 2: Services & Expertise
  servicesOffered: z.array(z.string()).min(1, "Please select at least one service"),
  specializations: z.string().min(10, "Please describe your specialisations (minimum 10 characters)"),
  
  // Step 3: Company Values & Mission
  mission: z.string().min(20, "Mission statement must be at least 20 characters"),
  values: z.string().min(20, "Company values must be at least 20 characters"),
  policies: z.string().optional(),
  
  // Step 4: Experience & Credentials
  pastProjects: z.string().min(20, "Please describe your past projects (minimum 20 characters)"),
  accreditations: z.string().optional(),
  yearsInBusiness: z.string().min(1, "Please select years in business"),
});

export type CompanyProfileData = z.infer<typeof companyProfileSchema>;

export const industryOptions = [
  "Construction & Engineering",
  "IT & Technology",
  "Healthcare",
  "Education",
  "Professional Services",
  "Manufacturing",
  "Transportation & Logistics",
  "Environmental Services",
  "Energy & Utilities",
  "Other"
];

export const teamSizeOptions = [
  "1-5 employees",
  "6-20 employees", 
  "21-50 employees",
  "51-200 employees",
  "200+ employees"
];

export const serviceOptions = [
  "Consulting",
  "Software Development",
  "Engineering Design",
  "Project Management",
  "Research & Development",
  "Training & Education",
  "Maintenance & Support",
  "Installation Services",
  "Quality Assurance",
  "Technical Writing"
];

export const yearsInBusinessOptions = [
  "Less than 1 year",
  "1-2 years",
  "3-5 years", 
  "6-10 years",
  "11-20 years",
  "20+ years"
];