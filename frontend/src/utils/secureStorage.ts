// Secure storage utility with proper error handling for both web and native platforms
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.setItem(key, value);
      } else {
        // Use SecureStore for native platforms (iOS/Android)
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Failed to set ${key} in storage:`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        return localStorage.getItem(key);
      } else {
        // Use SecureStore for native platforms (iOS/Android)
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Failed to get ${key} from storage:`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.removeItem(key);
      } else {
        // Use SecureStore for native platforms (iOS/Android)
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Failed to delete ${key} from storage:`, error);
    }
  }
};
