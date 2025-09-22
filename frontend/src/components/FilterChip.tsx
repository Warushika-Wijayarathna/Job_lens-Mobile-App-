import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress, className }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={twMerge(
        'px-4 py-2 rounded-full mr-2 mb-2 flex-row items-center shadow-sm',
        selected ? 'bg-blue-600' : 'bg-gray-100',
        selected ? 'border border-blue-700' : 'border border-gray-300',
        className
      )}
    >
      <Text className={twMerge('text-sm font-medium', selected ? 'text-white' : 'text-gray-700')}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

