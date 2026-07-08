export interface Job {
  id: number;
  title: string;
  company: string;
  companyId: number;
  companyLogo: string;
  location: string;
  type: string;
  category?: string;
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
  acceptedCount?: number;
  isUrgent?: boolean;
  isRemote?: boolean;
  
  workStartTime?: string;
  workEndTime?: string;
  workDays?: string;
  employerType?: number;
  
  // Phase 4: Escrow & Completion Tracking
  budget?: number;
  commission?: number;
  headCount?: number;
  status?: 'open' | 'in_progress' | 'pending_confirmation' | 'completed' | 'closed' | 'disputed';
  selectedStudentId?: number;
  applicants?: number[];
  companyDescription?: string;
  companyIndustry?: string;
  companySize?: string;
  companyLocation?: string;
  companyWebsite?: string;
  isCompanyPremium?: boolean;
  disputeReason?: string;
  employerEvidenceText?: string;
  employerEvidenceUrl?: string;
  studentEvidenceText?: string;
  studentEvidenceUrl?: string;
  disputedDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  isAppliedByCurrentUser?: boolean;
}
