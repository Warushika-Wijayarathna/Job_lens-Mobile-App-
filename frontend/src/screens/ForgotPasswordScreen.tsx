import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-100 via-white to-blue-200 justify-center items-center px-6">
      <MotiView
        from={{ opacity: 0, translateY: 40 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 700 }}
        className="w-full items-center"
      >
        <View className="bg-white rounded-3xl shadow-lg p-8 items-center w-full max-w-sm">
          <Text className="text-2xl font-bold text-blue-700 mb-6 text-center tracking-tight">
            Forgot Password
          </Text>
          <Text className="text-base text-gray-600 mb-6 text-center">
            Enter your email and we'll send you instructions to reset your password.
          </Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            leftIcon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            title="Send Instructions"
            style={{ width: '100%', backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 12, marginBottom: 8 }}
            onPress={() => {/* TODO: Handle Forgot Password */}}
          />
          <TouchableOpacity
            style={{ marginTop: 16 }}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back to Login"
          >
            <Text className="text-blue-600 font-medium">Back to Login</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
}
