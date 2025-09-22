import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/api';
import { JobsState, Job, JobSearchParams } from '../../types';

// Async thunks for jobs
export const fetchJobs = createAsyncThunk<
  { jobs: Job[], append: boolean },
  JobSearchParams & { append?: boolean },
  { rejectValue: string }
>(
  'jobs/fetchJobs',
  async (searchParams = {}, { rejectWithValue }) => {
    try {
      const { append = false, ...params } = searchParams;
      const resp = await apiService.getJobs(params);
      if (resp.success && resp.data) {
        let list = resp.data.jobs || [];
        // If empty and not appending, try to sync from Remotive then fetch again
        if (!list || (list.length === 0 && !append)) {
          const sync = await apiService.syncJobs();
          if (!sync.success) {
            return rejectWithValue(sync.message || 'Sync failed');
          }
          const resp2 = await apiService.getJobs(params);
          if (resp2.success && resp2.data && resp2.data.jobs) {
            return { jobs: resp2.data.jobs, append };
          }
          return { jobs: [], append };
        }
        return { jobs: list, append };
      } else {
        return rejectWithValue(resp.message || 'Failed to fetch jobs');
      }
    } catch (error: any) {
      console.error('fetchJobs error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

export const searchJobs = createAsyncThunk<
  Job[],
  JobSearchParams,
  { rejectValue: string }
>(
  'jobs/searchJobs',
  async (searchParams, { rejectWithValue }) => {
    try {
      const resp = await apiService.searchJobs(searchParams);
      if (resp.success && resp.data && resp.data.jobs) {
        return resp.data.jobs;
      } else {
        return rejectWithValue(resp.message || 'Search failed');
      }
    } catch (error: any) {
      console.error('searchJobs error:', error);
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

export const matchJobWithUser = createAsyncThunk<
  any,
  { jobId: string, userId: string },
  { rejectValue: string }
>(
  'jobs/matchJobWithUser',
  async ({ jobId, userId }, { rejectWithValue }) => {
    try {
      const response = await apiService.matchJobWithUser(jobId, userId);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Job matching failed');
      }
    } catch (error: any) {
      console.error('matchJobWithUser error:', error);
      return rejectWithValue(error.response?.data?.message || 'Job matching failed');
    }
  }
);

const initialState: JobsState = {
  jobs: [],
  selectedJob: null,
  recommendations: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  error: null,
  searchError: null,
  searchFilters: {
    q: '',
    limit: 20,
    offset: 0,
  },
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch jobs
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.append) {
          // Append new jobs for infinite scrolling
          const existingIds = new Set(state.jobs.map(job => job.id));
          const newJobs = action.payload.jobs.filter(job => !existingIds.has(job.id));
          state.jobs = [...state.jobs, ...newJobs];
        } else {
          // Replace jobs for initial load or refresh
          state.jobs = action.payload.jobs;
        }
        state.error = null;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch jobs';
      })

      // Search jobs
      .addCase(searchJobs.pending, (state) => {
        state.isSearching = true;
        state.searchError = null;
      })
      .addCase(searchJobs.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
        state.searchError = null;
      })
      .addCase(searchJobs.rejected, (state, action) => {
        state.isSearching = false;
        state.searchError = action.payload || 'Search failed';
      })

      // Match job with user
      .addCase(matchJobWithUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(matchJobWithUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(matchJobWithUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Job matching failed';
      })
  },
});

export const { clearSearchResults } = jobsSlice.actions;

export default jobsSlice.reducer;
