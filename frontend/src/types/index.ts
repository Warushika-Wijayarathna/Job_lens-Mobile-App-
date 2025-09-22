// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  skills: string[];
  experience_years: number;
  location: string;
  created_at: string;
  updated_at: string;
  resume_url?: string; // Add resume_url field
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_at: string;
  refresh_expires_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

// Job Types (aligned with backend Remotive model)
export interface Job {
  id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location?: string | null;
  url: string;
  description: string;
  created_at: string;
  external_id?: string | null;
  job_type?: string | null;
  salary?: string | null;
  category?: string | null;
}

export interface JobSearchParams {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface JobRecommendation {
  job: Job;
  // Support both shapes
  match_score?: number;
  match_percentage?: number;
  explanation?: string;
  matching_skills?: string[];
  skills_matched?: number;
  missing_skills: string[];
}

// Application Types
export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string;
  match_score?: number;
  job_title?: string;
  company_name?: string;
  // Resume metadata
  resume_filename?: string | null;
  resume_uploaded_at?: string | null;
}

export type ApplicationStatus =
  | 'pending'
  | 'viewed'
  | 'under_review'
  | 'interviewing'
  | 'rejected'
  | 'accepted'
  | 'withdrawn';

export interface ApplicationInsights {
  success_probability: number;
  improvement_suggestions: string[];
  similar_successful_profiles: string[];
}

export interface CreateApplicationRequest {
  job_id: string;
  cover_letter?: string;
  match_score?: number; // Add match_score field
}

// Feedback Types
export interface UserFeedback {
  id: string;
  user_id: string;
  job_id: string;
  feedback_type: FeedbackType;
  rating?: number;
  timestamp: string;
  metadata?: any;
}

export type FeedbackType =
  | 'job_recommendation'
  | 'match_accuracy'
  | 'application_outcome'
  | 'skill_relevance';

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Upload: undefined;
  Applications: undefined;
  Profile: undefined;
};

export type JobsStackParamList = {
  ResumeUpload: undefined;
  ProcessingScreen: undefined;
  JobMatchesScreen: undefined;
  JobsList: undefined;
  JobDetails: { job: Job };
  JobMatching: { job: Job };
};

export type ApplicationsStackParamList = {
  ApplicationsList: undefined;
  ApplicationDetails: { application: Application };
  ApplicationInsights: { applicationId: string };
};

// Redux State Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface JobsState {
  jobs: Job[];
  selectedJob: Job | null;
  recommendations: JobRecommendation[];
  searchResults: Job[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  searchError: string | null;
  searchFilters: JobSearchParams;
}

export interface ApplicationsState {
  applications: Application[];
  selectedApplication: Application | null;
  insights: Record<string, ApplicationInsights>;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createError: string | null;
  statistics: ApplicationStatistics;
}

export interface ApplicationStatistics {
  total: number;
  pending: number;
  interviewed: number;
  rejected: number;
  accepted: number;
}

export interface UserState {
  recommendations: JobRecommendation[];
  feedback: UserFeedback[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  updateError: string | null;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  emailUpdates: boolean;
  jobAlerts: boolean;
}

export interface UserStats {
  profileViews: number;
  applicationsSent: number;
  interviewsScheduled: number;
  recommendationsViewed: number;
}

// Utility Types
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Backend responses for jobs
export interface JobsResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface SyncResponse {
  jobs_added: number;
  message: string;
}
