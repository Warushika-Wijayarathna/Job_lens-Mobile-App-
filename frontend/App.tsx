import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { store } from './src/store';
import type { RootState } from './src/store';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import JobListScreen from './src/screens/JobListScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ResumeMatchScreen from './src/screens/ResumeMatchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Import NavBar
import { NavBar } from './src/components/NavBar';
import { View } from 'react-native';

import './global.css';

const Stack = createStackNavigator();

function AppNavigator() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated || !user ? (
          // Authentication Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Home">
              {() => (
                <View style={{ flex: 1 }}>
                  <HomeScreen />
                  <NavBar activeIndex={0} />
                </View>
              )}
            </Stack.Screen>
            <Stack.Screen name="Jobs">
              {() => (
                <View style={{ flex: 1 }}>
                  <JobListScreen />
                  <NavBar activeIndex={1} />
                </View>
              )}
            </Stack.Screen>
            <Stack.Screen name="ResumeMatch">
              {() => (
                <View style={{ flex: 1 }}>
                  <ResumeMatchScreen />
                  <NavBar activeIndex={2} />
                </View>
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {() => (
                <View style={{ flex: 1 }}>
                  <ProfileScreen />
                  <NavBar activeIndex={3} />
                </View>
              )}
            </Stack.Screen>
            <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}
