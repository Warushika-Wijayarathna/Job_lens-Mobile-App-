import React from 'react';
import { View, Text } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface TagProps {
  label: string;
  color?: string; // e.g. 'blue', 'green', 'gray', etc.
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ label, color = 'blue', className }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <View className={twMerge(
      'px-3 py-1 rounded-full mr-2 mb-2 items-center justify-center',
      colorMap[color] || colorMap['blue'],
      className
    )}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
};

