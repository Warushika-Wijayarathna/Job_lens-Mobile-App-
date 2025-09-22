import React from 'react';
import { View } from 'react-native';
import HomeScreen from '../src/screens/HomeScreen';
import { NavBar } from '@/src/components/NavBar';

export default function Page() {
  return (
    <View className="flex-1">
      <HomeScreen />
      <NavBar activeIndex={0} />
    </View>
  );
}
