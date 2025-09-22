import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { twMerge } from 'tailwind-merge';

interface JobCardProps {
  title: string;
  company: string;
  location: string;
  salary?: string;
  logo?: any;
  saved?: boolean;
  onSave?: () => void;
  onPress?: () => void;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  title,
  company,
  location,
  salary,
  logo,
  saved,
  onSave,
  onPress,
  className,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={twMerge(
      'flex-row items-center bg-white rounded-2xl shadow-md p-4 mb-4',
      className
    )}
  >
    <View className="mr-4">
      {logo ? (
        <Image source={logo} className="w-12 h-12 rounded-xl" />
      ) : (
        <View className="w-12 h-12 rounded-xl bg-gray-200 items-center justify-center">
          <Text className="text-lg font-bold text-gray-400">JL</Text>
        </View>
      )}
    </View>
    <View className="flex-1">
      <Text className="text-base font-semibold text-blue-700" numberOfLines={1}>{title}</Text>
      <Text className="text-sm text-gray-600" numberOfLines={1}>{company}</Text>
      <Text className="text-xs text-gray-400 mt-1">{location}{salary ? ` • ${salary}` : ''}</Text>
    </View>
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation(); // Prevent triggering the card's onPress
        onSave?.();
      }}
      accessibilityLabel={saved ? 'Unsave Job' : 'Save Job'}
      className="ml-2"
    >
      <Bookmark color={saved ? '#3b82f6' : '#d1d5db'} fill={saved ? '#3b82f6' : 'none'} size={22} />
    </TouchableOpacity>
  </TouchableOpacity>
);
