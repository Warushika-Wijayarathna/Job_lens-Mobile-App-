// frontend/src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { AuthState, LoginCredentials, RegisterData, User } from '../../types';
import { secureStorage } from '../../utils/secureStorage';
import { Platform } from 'react-native';
import { makeRedirectUri, AuthRequest, ResponseType } from 'expo-auth-session';
import apiService from '../../services/api';

// Helper function to convert backend user to frontend user format
const convertBackendUserToFrontend = (backendUser: any): User => {
  return {
    id: backendUser.id,
    email: backendUser.email,
    first_name: backendUser.first_name,
    last_name: backendUser.last_name,
    skills: backendUser.skills || [],
    experience_years: backendUser.experience_years || 0,
    location: backendUser.location || '',
    created_at: backendUser.created_at || new Date().toISOString(),
    updated_at: backendUser.updated_at || new Date().toISOString(),
  };
};

// Google sign-in (web uses popup; native uses AuthRequest to get id_token)
export const signInWithGoogle = createAsyncThunk<
    { user: User; token: string },
    void,
    { rejectValue: string }
>('auth/google', async (_, { rejectWithValue }) => {
  console.log('[authSlice] signInWithGoogle invoked');
  try {
    if (Platform.OS === 'web') {
      console.log('[authSlice] signInWithGoogle web flow');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Use backend API for Google authentication
      const response = await apiService.loginWithGoogle(idToken);
      if (response.success && response.data) {
        // Store both access and refresh tokens
        await secureStorage.setItem('auth_token', response.data.access_token);
        await secureStorage.setItem('refresh_token', response.data.refresh_token);

        // Convert backend user format to frontend format
        const user = convertBackendUserToFrontend(response.data.user);
        await secureStorage.setItem('user_data', JSON.stringify(user));

        console.log('[authSlice] signInWithGoogle web success');
        return { user, token: response.data.access_token };
      } else {
        throw new Error(response.message || 'Google sign-in failed');
      }
    } else {
      console.log('[authSlice] signInWithGoogle native flow');
      const redirectUri = makeRedirectUri();
      const clientId = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] as string;
      if (!clientId) throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      };

      const request = new AuthRequest({
        clientId,
        responseType: ResponseType.IdToken,
        scopes: ['openid', 'email', 'profile'],
        redirectUri,
        extraParams: { nonce: 'nonce' },
      });

      const result = await request.promptAsync(discovery);
      console.log('[authSlice] promptAsync result:', result.type);
      if (result.type !== 'success' || !result.params || !result.params['id_token']) {
        throw new Error('Google sign-in canceled or failed');
      }

      const idToken = result.params['id_token'] as string;

      // Use backend API for Google authentication
      const response = await apiService.loginWithGoogle(idToken);
      if (response.success && response.data) {
        // Store both access and refresh tokens
        await secureStorage.setItem('auth_token', response.data.access_token);
        await secureStorage.setItem('refresh_token', response.data.refresh_token);

        // Convert backend user format to frontend format
        const user = convertBackendUserToFrontend(response.data.user);
        await secureStorage.setItem('user_data', JSON.stringify(user));

        console.log('[authSlice] signInWithGoogle native success');
        return { user, token: response.data.access_token };
      } else {
        throw new Error(response.message || 'Google sign-in failed');
      }
    }
  } catch (e: any) {
    console.warn('[authSlice] signInWithGoogle error:', e?.message || e);
    return rejectWithValue(e.message || 'Google sign-in failed');
  }
});

// Regular login
export const loginUser = createAsyncThunk<
  { user: User; token: string },
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await apiService.login(credentials);
    if (response.success && response.data) {
      // Store both access and refresh tokens
      await secureStorage.setItem('auth_token', response.data.access_token);
      await secureStorage.setItem('refresh_token', response.data.refresh_token);

      const user = convertBackendUserToFrontend(response.data.user);
      await secureStorage.setItem('user_data', JSON.stringify(user));

      return { user, token: response.data.access_token };
    } else {
      return rejectWithValue(response.message || 'Login failed');
    }
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
  }
});

// Register user
export const registerUser = createAsyncThunk<
  { user: User; token: string },
  RegisterData,
  { rejectValue: string }
>('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await apiService.register(userData);
    if (response.success && response.data) {
      // Store both access and refresh tokens
      await secureStorage.setItem('auth_token', response.data.access_token);
      await secureStorage.setItem('refresh_token', response.data.refresh_token);

      const user = convertBackendUserToFrontend(response.data.user);
      await secureStorage.setItem('user_data', JSON.stringify(user));

      return { user, token: response.data.access_token };
    } else {
      return rejectWithValue(response.message || 'Registration failed');
    }
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
  }
});

// Load stored auth from secure storage
export const loadStoredAuth = createAsyncThunk<
    { user: User; token: string } | null,
    void,
    { rejectValue: string }
>(
    'auth/loadStored',
    async (_) => {
      console.log('[authSlice] loadStoredAuth invoked');
      try {
        const token = await secureStorage.getItem('auth_token');
        const userData = await secureStorage.getItem('user_data');

        if (token && userData) {
          // Verify token with backend
          const response = await apiService.verifyToken(token);
          if (response.success) {
            const user = JSON.parse(userData);
            console.log('[authSlice] loadStoredAuth success');
            return { user, token };
          } else {
            // Token is invalid, clear storage
            await secureStorage.removeItem('auth_token');
            await secureStorage.removeItem('user_data');
            console.log('[authSlice] loadStoredAuth: invalid token, cleared storage');
            return null;
          }
        } else {
          console.log('[authSlice] loadStoredAuth: no stored auth data');
          return null;
        }
      } catch (error: any) {
        console.warn('[authSlice] loadStoredAuth error:', error?.message || error);
        // Clear potentially corrupted data
        await secureStorage.removeItem('auth_token');
        await secureStorage.removeItem('user_data');
        return null;
      }
    }
);

// Logout function
export const logoutUser = createAsyncThunk<
    void,
    void,
    { rejectValue: string }
>(
    'auth/logout',
    async (_, { rejectWithValue }) => {
      console.log('[authSlice] logoutUser invoked');
      try {
        // Clear secure storage including refresh token
        await secureStorage.removeItem('auth_token');
        await secureStorage.removeItem('refresh_token');
        await secureStorage.removeItem('user_data');

        // Also sign out from Firebase if user was signed in there (for Google OAuth)
        try {
          await signOut(auth);
        } catch (e) {
          // Ignore Firebase signout errors as user might not be signed in there
          console.log('[authSlice] Firebase signout not needed or failed (ignored):', e);
        }

        console.log('[authSlice] logoutUser success');
        return;
      } catch (error: any) {
        console.warn('[authSlice] logoutUser error:', error?.message || error);
        return rejectWithValue(error.message || 'Logout failed');
      }
    }
);

export const updateUserProfile = createAsyncThunk<
    User,
    Partial<User>,
    { rejectValue: string }
>(
    'auth/updateProfile',
    async (updates, { getState, rejectWithValue }) => {
      try {
        const state = getState() as { auth: AuthState };
        const currentUser = state.auth.user;

        if (!currentUser) {
          return rejectWithValue('No user logged in');
        }

        // Use backend API to update user profile
        const response = await apiService.updateUser(currentUser.id, updates);

        if (response.success && response.data) {
          // Convert backend response to frontend format
          const updatedUser = convertBackendUserToFrontend(response.data);

          // Update stored user data
          await secureStorage.setItem('user_data', JSON.stringify(updatedUser));
          return updatedUser;
        } else {
          throw new Error(response.message || 'Profile update failed');
        }
      } catch (error: any) {
        return rejectWithValue(error.message || 'Profile update failed');
      }
    }
);

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      console.log('[authSlice] clearError');
      state.error = null;
    },
    setAuth: (state, action: { payload: { user: User; token: string } }) => {
      console.log('[authSlice] setAuth reducer', { userId: action.payload.user.id });
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    updateUser: (state, action: { payload: Partial<User> }) => {
      console.log('[authSlice] updateUser reducer', Object.keys(action.payload));
      if (state.user) {
        state.user = { ...state.user, ...action.payload } as User;
      }
    },
  },
  extraReducers: (builder) => {
    builder
        // Google
        .addCase(signInWithGoogle.pending, (state) => {
          console.log('[authSlice] signInWithGoogle.pending');
          state.isLoading = true;
          state.error = null;
        })
        .addCase(signInWithGoogle.fulfilled, (state, action) => {
          console.log('[authSlice] signInWithGoogle.fulfilled');
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.error = null;
        })
        .addCase(signInWithGoogle.rejected, (state, action) => {
          console.log('[authSlice] signInWithGoogle.rejected', action.payload);
          state.isLoading = false;
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.error = action.payload || 'Google sign-in failed';
        })

        // Login
        .addCase(loginUser.pending, (state) => {
          console.log('[authSlice] loginUser.pending');
          state.isLoading = true;
          state.error = null;
        })
        .addCase(loginUser.fulfilled, (state, action) => {
          console.log('[authSlice] loginUser.fulfilled');
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.error = null;
        })
        .addCase(loginUser.rejected, (state, action) => {
          console.log('[authSlice] loginUser.rejected', action.payload);
          state.isLoading = false;
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.error = action.payload || 'Login failed';
        })

        // Register
        .addCase(registerUser.pending, (state) => {
          console.log('[authSlice] registerUser.pending');
          state.isLoading = true;
          state.error = null;
        })
        .addCase(registerUser.fulfilled, (state, action) => {
          console.log('[authSlice] registerUser.fulfilled');
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.error = null;
        })
        .addCase(registerUser.rejected, (state, action) => {
          console.log('[authSlice] registerUser.rejected', action.payload);
          state.isLoading = false;
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.error = action.payload || 'Registration failed';
        })

        // Load stored auth
        .addCase(loadStoredAuth.pending, (state) => {
          console.log('[authSlice] loadStoredAuth.pending');
          state.isLoading = true;
        })
        .addCase(loadStoredAuth.fulfilled, (state, action) => {
          console.log('[authSlice] loadStoredAuth.fulfilled with', action.payload ? 'user' : 'null');
          state.isLoading = false;
          if (action.payload) {
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
          } else {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
          }
        })
        .addCase(loadStoredAuth.rejected, (state) => {
          console.log('[authSlice] loadStoredAuth.rejected');
          state.isLoading = false;
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        })

        // Logout
        .addCase(logoutUser.pending, (state) => {
          console.log('[authSlice] logoutUser.pending');
          state.isLoading = true;
        })
        .addCase(logoutUser.fulfilled, (state) => {
          console.log('[authSlice] logoutUser.fulfilled');
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.error = null;
          state.isLoading = false;
        })

        // Update profile
        .addCase(updateUserProfile.fulfilled, (state, action) => {
          console.log('[authSlice] updateUserProfile.fulfilled');
          state.user = action.payload;
        })
        .addCase(updateUserProfile.rejected, (state, action) => {
          state.error = action.payload || 'Profile update failed';
        });
  },
});

export const { clearError, setAuth, updateUser } = authSlice.actions;
export default authSlice.reducer;
