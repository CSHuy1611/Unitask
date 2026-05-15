export interface User {
  id: number;
  email: string;
  password: string;
  role: 'student' | 'employer' | 'admin';
  fullName: string;
  avatar: string;        // Initials (fallback)
  avatarUrl?: string;    // Cloudinary URL for profile photo
  phone: string;
  ekycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  ekycDate: string | null;
  ekycFrontImage?: string; // Cloudinary URL of CCCD front side
  ekycBackImage?: string;  // Cloudinary URL of CCCD back side
  createdAt: string;

  // Student fields
  university?: string;
  major?: string;
  year?: number;
  gpa?: number;
  skills?: string[];
  bio?: string;
  appliedJobs?: number[];
  savedJobs?: number[];
  workingJobs?: number[]; // IDs of jobs assigned to the student (in_progress, pending_confirmation, completed)
  cvFileName?: string;
  cvUploadDate?: string;
  address?: string;
  dateOfBirth?: string;

  // Employer fields
  companyId?: number;
  companyName?: string;
  position?: string;

  // Payment & Subscriptions
  balance?: number;
  activePackage?: string;
  packageExpiry?: string;
  postedJobs?: number[];
}
