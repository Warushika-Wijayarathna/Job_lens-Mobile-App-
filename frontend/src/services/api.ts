import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { secureStorage } from '../utils/secureStorage';
import { Platform } from 'react-native';
import {
  ApiResponse,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  Job,
  JobSearchParams,
  JobRecommendation,
  Application,
  CreateApplicationRequest,
  ApplicationInsights,
  UserFeedback,
  JobsResponse,
  SyncResponse,
} from '../types';

// Backend API URL - Make it environment configurable
const getBaseUrl = () => {
  // 1) Explicit env wins
  if (process.env['EXPO_PUBLIC_API_URL']) {
    return process.env['EXPO_PUBLIC_API_URL'];
  }

  // 2) Web: derive from current origin host
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    return `http://${host}:8080/api`;
  }

  // 3) Native dev: try to infer from Expo
  if (__DEV__) {
    try {
      const Constants = require('expo-constants').default || require('expo-constants');
      const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || Constants?.manifest?.debuggerHost;
      if (hostUri) {
        let host = String(hostUri).split(':')[0];
        // Android emulator can't access localhost; use 10.0.2.2
        if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
          host = '10.0.2.2';
        }
        return `http://${host}:8080/api`;
      }
    } catch (_) {
      // ignore and fallback below
    }

    // 4) Final platform-specific fallbacks
    if (Platform.OS === 'android') {
      // Android Emulator loopback to host
      return 'http://10.0.2.2:8080/api';
    }
    // iOS simulator or other
    return 'http://127.0.0.1:8080/api';
  }

  // 5) Production fallback
  return 'http://127.0.0.1:8080/api';
};

const BASE_URL = getBaseUrl();
console.log('[Api] Using BASE_URL:', BASE_URL);

class ApiService {
  private api: AxiosInstance;
  private refreshTokenPromise: Promise<string | null> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 30000, // increased default timeout to 30s
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await secureStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.log('Failed to get auth token from SecureStore:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Enhanced response interceptor with automatic token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        console.log('[API Error]', error.response?.data || error.message);

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await secureStorage.getItem('refresh_token');
            if (refreshToken) {
              // Try to refresh the token
              const newAccessToken = await this.refreshAccessToken(refreshToken);
              if (newAccessToken) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return this.api(originalRequest);
              }
            }
          } catch (refreshError) {
            console.log('Token refresh failed:', refreshError);
          }

          // If refresh fails or no refresh token, clear auth data
          try {
            await secureStorage.removeItem('auth_token');
            await secureStorage.removeItem('refresh_token');
            await secureStorage.removeItem('user_data');
          } catch (e) {
            console.log('Failed to delete auth data:', e);
          }
        }

        // Enhanced error handling to preserve backend error messages
        if (error.response?.data) {
          const backendError = error.response.data;
          if (backendError.error) {
            error.message = backendError.error;
          } else if (backendError.message) {
            error.message = backendError.message;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = this.performTokenRefresh(refreshToken);

    try {
      const newToken = await this.refreshTokenPromise;
      return newToken;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string | null> {
    try {
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken
      });

      if (response.data.success && response.data.data) {
        const { access_token, refresh_token: newRefreshToken } = response.data.data;

        // Store new tokens
        await secureStorage.setItem('auth_token', access_token);
        await secureStorage.setItem('refresh_token', newRefreshToken);

        return access_token;
      }
      return null;
    } catch (error) {
      console.log('Token refresh request failed:', error);
      return null;
    }
  }

  // ---------------- Authentication ----------------
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async verifyToken(token: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/auth/verify', { token });
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<ApiResponse<AuthResponse>> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/google', { id_token: idToken });
    return response.data;
  }

  // ---------------- User ----------------
  async getUser(userId: string): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put(`/users/${userId}`, userData);
    return response.data;
  }

  async getUserRecommendations(userId: string, limit: number = 10): Promise<ApiResponse<JobRecommendation[]>> {
    const response: AxiosResponse<ApiResponse<JobRecommendation[]>> = await this.api.get(
        `/users/${userId}/recommendations?limit=${limit}`
    );
    return response.data;
  }

  // ---------------- Jobs ----------------
  async getJobs(searchParams: JobSearchParams = {}): Promise<ApiResponse<JobsResponse>> {
    const response: AxiosResponse<ApiResponse<JobsResponse>> = await this.api.get('/jobs', { params: searchParams });
    return response.data;
  }

  async syncJobs(): Promise<ApiResponse<SyncResponse>> {
    const response: AxiosResponse<ApiResponse<SyncResponse>> = await this.api.post('/jobs/sync', undefined, { timeout: 60000 });
    return response.data;
  }

  async getJob(jobId: string): Promise<ApiResponse<Job>> {
    const response: AxiosResponse<ApiResponse<Job>> = await this.api.get(`/jobs/${jobId}`);
    return response.data;
  }

  async searchJobs(searchParams: JobSearchParams): Promise<ApiResponse<JobsResponse>> {
    const response: AxiosResponse<ApiResponse<JobsResponse>> = await this.api.get('/jobs/search', { params: searchParams });
    return response.data;
  }

  async getJobRecommendations(userId: string, jobId: string): Promise<ApiResponse<JobRecommendation[]>> {
    const response: AxiosResponse<ApiResponse<JobRecommendation[]>> = await this.api.get(
        `/jobs/${jobId}/recommendations/${userId}`
    );
    return response.data;
  }

  async matchJobWithUser(jobId: string, userId: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
        `/jobs/${jobId}/match/${userId}`
    );
    return response.data;
  }

  // ---------------- Applications ----------------
  async createApplication(userId: string, applicationData: CreateApplicationRequest): Promise<ApiResponse<Application>> {
    const response: AxiosResponse<ApiResponse<Application>> = await this.api.post(
        `/applications/users/${userId}`,
        applicationData
    );
    return response.data;
  }

  async getUserApplications(userId: string): Promise<ApiResponse<Application[]>> {
    const response: AxiosResponse<ApiResponse<Application[]>> = await this.api.get(`/applications/users/${userId}`);
    return response.data;
  }

  async getApplicationInsights(applicationId: string): Promise<ApiResponse<ApplicationInsights>> {
    const response: AxiosResponse<ApiResponse<ApplicationInsights>> = await this.api.get(
        `/applications/${applicationId}/insights`
    );
    return response.data;
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<ApiResponse<void>> {
    const response: AxiosResponse<ApiResponse<void>> = await this.api.put(
        `/applications/${applicationId}/status`,
        { status }
    );
    return response.data;
  }

  // New: Upload application resume (PDF)
  async uploadApplicationResume(
    applicationId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<ApiResponse<{ filename: string; uploaded_at: string }>> {
    const form = new FormData();
    // @ts-ignore - React Native FormData file shape
    form.append('file', { uri: file.uri, name: file.name, type: file.type });

    const response: AxiosResponse<ApiResponse<{ filename: string; uploaded_at: string }>> = await this.api.post(
      `/applications/${applicationId}/resume`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  // New: Get direct resume URL for viewing
  getApplicationResumeUrl(applicationId: string): string {
    return `${BASE_URL}/applications/${applicationId}/resume`;
  }

  // New: Upload user resume (PDF) to profile
  async uploadUserResume(
    userId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<ApiResponse<{ filename: string; uploaded_at: string }>> {
    const form = new FormData();
    // @ts-ignore - React Native FormData file shape
    form.append('file', { uri: file.uri, name: file.name, type: file.type });

    const response: AxiosResponse<ApiResponse<{ filename: string; uploaded_at: string }>> = await this.api.post(
      `/users/${userId}/resume`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  // New: Get direct user resume URL for viewing
  getUserResumeUrl(userId: string): string {
    return `${BASE_URL}/users/${userId}/resume`;
  }

  // New: Match job with user's CV using AI
  async matchJobWithCV(
    userId: string,
    jobId: string
  ): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/jobs/${jobId}/match/${userId}`
    );
    return response.data;
  }

  // New: AI Resume Matching - upload resume and get job recommendations
  async uploadResumeForMatching(
    userId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<ApiResponse<{ recommendations: JobRecommendation[]; resume_text: string }>> {
    const form = new FormData();
    // @ts-ignore - React Native FormData file shape
    form.append('file', { uri: file.uri, name: file.name, type: file.type });

    const response: AxiosResponse<ApiResponse<{ recommendations: JobRecommendation[]; resume_text: string }>> = await this.api.post(
      `/users/${userId}/resume/match`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // Increase timeout for AI processing
      }
    );
    return response.data;
  }

  // New: Get AI job recommendations based on skills
  async getAIJobRecommendations(
    userId: string,
    skills: string
  ): Promise<ApiResponse<{ recommendations: JobRecommendation[] }>> {
    const response: AxiosResponse<ApiResponse<{ recommendations: JobRecommendation[] }>> = await this.api.post(
      `/users/${userId}/recommendations/skills`,
      { skills }
    );
    return response.data;
  }

  // ---------------- Feedback ----------------
  async submitFeedback(feedbackData: Partial<UserFeedback>): Promise<ApiResponse<UserFeedback>> {
    const response: AxiosResponse<ApiResponse<UserFeedback>> = await this.api.post('/feedback', feedbackData);
    return response.data;
  }

  async getUserFeedback(userId: string): Promise<ApiResponse<UserFeedback[]>> {
    const response: AxiosResponse<ApiResponse<UserFeedback[]>> = await this.api.get(`/feedback/user/${userId}`);
    return response.data;
  }

  // ---------------- Analytics ----------------
  async getAnalytics(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/analytics/metrics');
    return response.data;
  }

  // ---------------- Email ----------------
  async syncEmails(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/email/sync');
    return response.data;
  }

  async analyzeEmail(emailData: any): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/email/analyze', emailData);
    return response.data;
  }

  // ---------------- Health Check ----------------
  async getHealthStatus(): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
