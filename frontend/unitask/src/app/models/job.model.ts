export interface Job {
  id: number;
  title: string;
  company: string;
  companyId: number;
  companyLogo: string;
  location: string;
  type: string;
  salary: string;
  salaryRange: number[];
  description: string;
  requirements: string[];
  benefits: string[];
  tags: string[];
  postedDate: string;
  deadline: string;
  views: number;
  applications: number;
  isUrgent?: boolean;
  isRemote?: boolean;
  
  // Phase 4: Escrow & Completion Tracking
  budget?: number;
  commission?: number;
  status?: 'open' | 'in_progress' | 'pending_confirmation' | 'completed' | 'closed' | 'disputed';
  selectedStudentId?: number;
  applicants?: number[];
  companyDescription?: string;
  companyIndustry?: string;
  companySize?: string;
  companyLocation?: string;
  companyWebsite?: string;
  disputeReason?: string;
  employerEvidenceText?: string;
  employerEvidenceUrl?: string;
  studentEvidenceText?: string;
  studentEvidenceUrl?: string;
  disputedDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
}
