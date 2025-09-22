import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { twMerge } from 'tailwind-merge';

interface NotificationItemProps {
  title: string;
  description: string;
  timestamp: string;
  read?: boolean;
  onMarkRead?: () => void;
  className?: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  title,
  description,
  timestamp,
  read,
  onMarkRead,
  className,
}) => (
  <View className={twMerge(
    'flex-row items-start bg-white rounded-2xl shadow p-4 mb-3',
    read ? 'opacity-60' : '',
    className
  )}>
    <View className="mr-3 mt-1">
      <Bell color={read ? '#d1d5db' : '#3b82f6'} size={22} />
    </View>
    <View className="flex-1">
      <Text className="text-base font-semibold text-blue-700 mb-1" numberOfLines={1}>{title}</Text>
      <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>{description}</Text>
      <Text className="text-xs text-gray-400">{timestamp}</Text>
    </View>
    {!read && (
      <TouchableOpacity
        onPress={onMarkRead}
        className="ml-2 px-3 py-1 rounded-xl bg-blue-100"
        accessibilityLabel="Mark as read"
      >
        <Text className="text-xs text-blue-700 font-semibold">Mark as read</Text>
      </TouchableOpacity>
    )}
  </View>
);

