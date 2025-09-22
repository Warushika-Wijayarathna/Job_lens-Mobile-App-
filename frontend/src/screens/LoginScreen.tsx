import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { MotiView } from 'moti';
import { useSelector, useDispatch } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import type { RootState, AppDispatch } from '../store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = () => {
    dispatch(loginUser({ email, password }));
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Background Decoration */}
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.1 }}
            transition={{ type: 'timing', duration: 1500 }}
            className="absolute top-10 right-10 w-40 h-40 bg-blue-500 rounded-full"
          />
          <MotiView
            from={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.05 }}
            transition={{ type: 'timing', duration: 1800, delay: 200 }}
            className="absolute bottom-20 left-10 w-32 h-32 bg-indigo-500 rounded-full"
          />

          {/* Main Content */}
          <MotiView
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 800, delay: 300 }}
            className="w-full items-center"
          >
            {/* Header Section */}
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 400 }}
              className="items-center mb-8"
            >
              <View className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl shadow-lg mb-4">
                <Image
                    source={require('../../assets/logo.png')}
                    className="w-56 h-16"
                    accessibilityLabel="JobLens Logo"
                />
              </View>
              <Text className="text-base text-gray-500 text-center leading-relaxed">
                Sign in to continue your job search journey
              </Text>
            </MotiView>

            {/* Form Section */}
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600, delay: 600 }}
              className="bg-white rounded-3xl shadow-xl shadow-blue-100 p-8 w-full max-w-sm border border-gray-100"
            >
              <View className="space-y-4">
                <MotiView
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 500, delay: 800 }}
                >
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    leftIcon="mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </MotiView>

                <MotiView
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 500, delay: 900 }}
                >
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    leftIcon="lock-closed"
                    secureTextEntry
                  />
                </MotiView>

                <MotiView
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'timing', duration: 400, delay: 1000 }}
                >
                  <TouchableOpacity
                    className="self-end mb-2"
                    onPress={() => navigation.navigate('ForgotPassword')}
                  >
                    <Text className="text-blue-600 text-sm font-semibold">
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 150, delay: 1100 }}
                >
                  <Button
                    title={isLoading ? "Signing In..." : "Sign In"}
                    onPress={handleLogin}
                    disabled={isLoading}
                    loading={isLoading}
                  />
                </MotiView>

                {error && (
                  <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2"
                  >
                    <Text className="text-red-600 text-sm text-center font-medium">
                      {error}
                    </Text>
                  </MotiView>
                )}
              </View>
            </MotiView>

            {/* Footer */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 1200 }}
              className="flex-row justify-center items-center mt-8 bg-gray-50 rounded-2xl p-4"
            >
              <Text className="text-gray-600 text-base">New to JobLens? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text className="text-blue-600 font-bold text-base ml-1">
                  Create Account
                </Text>
              </TouchableOpacity>
            </MotiView>
          </MotiView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
