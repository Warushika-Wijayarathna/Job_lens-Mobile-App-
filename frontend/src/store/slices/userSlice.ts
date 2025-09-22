import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/api';
import {
  UserState,
  JobRecommendation,
  UserFeedback,
  User,
  UserPreferences,
  UserStats
} from '../../types';

// Async thunks for user operations
export const fetchUserRecommendations = createAsyncThunk<
  JobRecommendation[],
  { userId: string; limit?: number },
  { rejectValue: string }
>(
  'user/fetchRecommendations',
  async ({ userId, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserRecommendations(userId, limit);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommendations');
    }
  }
);

export const updateUserProfile = createAsyncThunk<
  User,
  { userId: string; userData: Partial<User> },
  { rejectValue: string }
>(
  'user/updateProfile',
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateUser(userId, userData);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const submitUserFeedback = createAsyncThunk<
  UserFeedback,
  Partial<UserFeedback>,
  { rejectValue: string }
>(
  'user/submitFeedback',
  async (feedbackData, { rejectWithValue }) => {
    try {
      const response = await apiService.submitFeedback(feedbackData);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit feedback');
    }
  }
);

export const uploadResumeForMatching = createAsyncThunk<
  { recommendations: JobRecommendation[]; resume_text: string },
  { userId: string; file: { uri: string; name: string; type: string }; resumeText?: string },
  { rejectValue: string }
>(
  'user/uploadResumeForMatching',
  async ({ userId, file, resumeText }, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadResumeForMatching(userId, file, { resumeText });
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process resume');
    }
  }
);

export const getAIJobRecommendations = createAsyncThunk<
  { recommendations: JobRecommendation[] },
  { userId: string; skills: string },
  { rejectValue: string }
>(
  'user/getAIJobRecommendations',
  async ({ userId, skills }, { rejectWithValue }) => {
    try {
      const response = await apiService.getAIJobRecommendations(userId, skills);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.message);
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get AI recommendations');
    }
  }
);

const initialState: UserState = {
  recommendations: [],
  feedback: [],
  isLoading: false,
  isUpdating: false,
  error: null,
  updateError: null,
  preferences: {
    notificationsEnabled: true,
    emailUpdates: true,
    jobAlerts: true,
  },
  stats: {
    profileViews: 0,
    applicationsSent: 0,
    interviewsScheduled: 0,
    recommendationsViewed: 0,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
      state.updateError = null;
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    incrementStat: (state, action: PayloadAction<{ statName: keyof UserStats }>) => {
      const { statName } = action.payload;
      if (state.stats[statName] !== undefined) {
        state.stats[statName]++;
      }
    },
    updateStats: (state, action: PayloadAction<Partial<UserStats>>) => {
      state.stats = { ...state.stats, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch recommendations
      .addCase(fetchUserRecommendations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserRecommendations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recommendations = action.payload;
        state.error = null;
      })
      .addCase(fetchUserRecommendations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch recommendations';
      })

      // Update profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state) => {
        state.isUpdating = false;
        state.updateError = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload || 'Failed to update profile';
      })

      // Submit feedback
      .addCase(submitUserFeedback.fulfilled, (state, action) => {
        state.feedback.unshift(action.payload);
      })

      // Upload resume for AI matching
      .addCase(uploadResumeForMatching.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadResumeForMatching.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recommendations = action.payload.recommendations;
        state.error = null;
      })
      .addCase(uploadResumeForMatching.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to process resume';
      })

      // Get AI job recommendations from skills
      .addCase(getAIJobRecommendations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAIJobRecommendations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recommendations = action.payload.recommendations;
        state.error = null;
      })
      .addCase(getAIJobRecommendations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to get AI recommendations';
      });
  },
});

export const {
  clearUserError,
  updatePreferences,
  incrementStat,
  updateStats,
} = userSlice.actions;

export default userSlice.reducer;
