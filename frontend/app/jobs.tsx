import React from 'react';
import { View } from 'react-native';
import JobListScreen from '../src/screens/JobListScreen';
import { NavBar } from '../src/components/NavBar';

export default function Page() {
  return (
    <View className="flex-1">
      <JobListScreen />
      <NavBar activeIndex={1} />
    </View>
  );
}
