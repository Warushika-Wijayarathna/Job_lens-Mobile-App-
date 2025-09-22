import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { JobCard } from '../components/JobCard';
import Button from '../components/ui/Button';
import { NavBar } from '../components/NavBar';
import { LogOut, Settings } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserRecommendations } from '../store/slices/userSlice';
import { logoutUser } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import type { RootState, AppDispatch } from '../store';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { recommendations, isLoading, error } = useSelector((state: RootState) => state.user);
  const [activeTab, setActiveTab] = useState(3); // Profile tab

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(fetchUserRecommendations({ userId: currentUser.id }));
    }
  }, [dispatch, currentUser?.id]);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    switch (index) {
      case 0:
        navigation.navigate('Home');
        break;
      case 1:
        navigation.navigate('Jobs');
        break;
      case 2:
        navigation.navigate('ResumeMatch');
        break;
      case 3:
        // Already on Profile screen
        break;
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-1">
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800, delay: 100 }}
          className="flex-1"
        >
          <View className="flex-1">
            {/* Header Section */}
            <View className="bg-blue-400 px-6 pt-4 pb-8 rounded-b-3xl shadow-lg">
              <SafeAreaView>
                <MotiView
                  from={{ opacity: 0, translateX: -30 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 600, delay: 200 }}
                >
                  <Text className="text-3xl font-bold text-white mb-1">
                    My Profile 👤
                  </Text>
                  <Text className="text-blue-100 text-base mb-6">
                    Manage your career journey and preferences
                  </Text>
                </MotiView>
              </SafeAreaView>
            </View>

            {/* Content Section */}
            <ScrollView
              className="flex-1 pb-20"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 90 }}
            >
              <View className="px-6 mt-6">
                <MotiView
                  from={{ opacity: 0, translateY: 30 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 600, delay: 600 }}
                  className="items-center mb-6"
                >
                  <Image source={require('../../assets/icon.png')} className="w-20 h-20 rounded-full mb-2" />
                  <Text className="text-xl font-bold text-gray-800">{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Guest'}</Text>
                  <Text className="text-base text-gray-500 mb-2">{currentUser?.email || ''}</Text>
                </MotiView>

                <Text className="text-xl font-bold text-gray-800 mb-4">Recommended Jobs for You</Text>
                {/* Recommendations */}
                {isLoading ? (
                  <View className="items-center py-8">
                    <Text className="text-gray-600">Loading recommendations...</Text>
                  </View>
                ) : error ? (
                  <Text style={{ color: 'red' }}>{error}</Text>
                ) : !recommendations || recommendations.length === 0 ? (
                  <Text className="text-center text-gray-400 mb-6">No recommendations yet.</Text>
                ) : (
                  recommendations.map((rec, i) => (
                    <JobCard
                      key={i}
                      title={rec.job.title}
                      company={rec.job.company}
                      location={rec.job.location || ''}
                      salary={rec.job.salary || undefined}
                      onSave={() => {}}
                    />
                  ))
                )}

                <View className="mt-8 mb-6">
                  <Text className="text-xl font-bold text-gray-800 mb-4">Settings</Text>
                  <TouchableOpacity className="flex-row items-center mb-4">
                    <Settings color="#3b82f6" size={20} />
                    <Text className="ml-2 text-base text-gray-700">Account Settings</Text>
                  </TouchableOpacity>
                  {/* Add more settings options here */}
                </View>

                <Button
                  title="Logout"
                  style={{ width: '100%', backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleLogout}
                  leftSlot={<LogOut color="#fff" size={20} />}
                />
              </View>
            </ScrollView>
          </View>
        </MotiView>
      </View>
    </View>
  );
}
