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
  matchPercentage?: number; // Add match percentage property
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
  matchPercentage, // Add match percentage to props
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
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-blue-700" numberOfLines={1}>{title}</Text>
        {matchPercentage !== undefined && (
          <View className={`rounded-full px-2 py-1 ${getMatchColor(matchPercentage)}`}>
            <Text className="text-xs font-bold text-white">{matchPercentage}%</Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-600" numberOfLines={1}>{company}</Text>
      <Text className="text-xs text-gray-400 mt-1">{location}{salary ? ` • ${salary}` : ''}</Text>
    </View>
    <TouchableOpacity
      onPress={onSave}
      className="ml-2 p-2"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Bookmark
        size={20}
        color={saved ? '#2563eb' : '#94a3b8'}
        fill={saved ? '#2563eb' : 'transparent'}
      />
    </TouchableOpacity>
  </TouchableOpacity>
);

// Helper function to determine color based on match percentage
const getMatchColor = (percentage: number) => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-yellow-500';
  return 'bg-gray-500';
};
