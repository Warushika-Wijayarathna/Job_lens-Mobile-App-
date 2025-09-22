import React from 'react';
import { View } from 'react-native';
import ProfileScreen from '../src/screens/ProfileScreen';
import { NavBar } from '@/src/components/NavBar';

export default function Page() {
  return (
    <View className="flex-1">
      <ProfileScreen />
      <NavBar activeIndex={3} />
    </View>
  );
}
