import React from 'react';
import { View } from 'react-native';
import ResumeMatchScreen from '../src/screens/ResumeMatchScreen';
import { NavBar } from '@/src/components/NavBar';

export default function Page() {
  return (
    <View className="flex-1">
      <ResumeMatchScreen />
      <NavBar activeIndex={2} />
    </View>
  );
}
