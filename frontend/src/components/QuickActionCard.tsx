import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  className?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, label, onPress, className }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    className={twMerge(
      'bg-white rounded-2xl shadow-md px-4 py-3 mr-4 items-center justify-center w-28 h-28',
      className
    )}
    accessibilityLabel={label}
  >
    <View className="mb-2">{icon}</View>
    <Text className="text-sm font-semibold text-blue-700 text-center">{label}</Text>
  </TouchableOpacity>
);

