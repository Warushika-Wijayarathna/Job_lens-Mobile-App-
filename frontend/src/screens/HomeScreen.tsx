import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import Input from '../components/ui/Input';
import { JobCard } from '../components/JobCard';
import { QuickActionCard } from '../components/QuickActionCard';
import { Search, FileText, Bookmark } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { RootState } from '../store';

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const user = useSelector((state: RootState) => state.auth.user);
  const navigation = useNavigation();

  const handleJobPress = (job: any) => {
    // Navigate to JobDetailsScreen with job data
    navigation.navigate('JobDetails', {
      jobData: {
        id: job.title.toLowerCase().replace(/\s+/g, '-'),
        title: job.title,
        company: job.company,
        company_logo: null,
        location: job.location,
        url: 'https://example.com/apply',
        description: `We are looking for a talented ${job.title} to join ${job.company}. This is an excellent opportunity to work with cutting-edge technologies and make a real impact in a growing company. You will be responsible for developing innovative solutions and collaborating with cross-functional teams.`,
        created_at: new Date().toISOString(),
        external_id: null,
        job_type: 'Full-time',
        salary: job.salary,
        category: 'Technology'
      }
    });
  };

  // @ts-ignore
  const quickActions = [
    {
      label: 'Job Search',
      icon: <Search color="#3b82f6" size={32} />,
      onPress: () => navigation.navigate('Jobs'),
    },
    {
      label: 'AI Resume Match',
      icon: <FileText color="#3b82f6" size={32} />,
      onPress: () => navigation.navigate('ResumeMatch'),
    },
    {
      label: 'Saved Jobs',
      icon: <Bookmark color="#3b82f6" size={32} />,
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  const recommendedJobs = [
    {
      title: 'Frontend Developer',
      company: 'TechNova',
      location: 'Remote',
      salary: '$80k - $100k',
      logo: require('../../assets/icon.png'),
      saved: false,
    },
    {
      title: 'AI Engineer',
      company: 'VisionaryAI',
      location: 'Colombo',
      salary: '$120k - $150k',
      logo: require('../../assets/icon.png'),
      saved: true,
    },
    {
      title: 'Product Designer',
      company: 'DesignHub',
      location: 'Remote',
      salary: '$70k - $90k',
      logo: require('../../assets/icon.png'),
      saved: false,
    },
  ];

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
                    Welcome back, {user ? user.first_name : 'there'}! 👋
                  </Text>
                  <Text className="text-blue-100 text-base mb-6">
                    Ready to find your dream job?
                  </Text>
                </MotiView>

                {/* Search Section */}
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 600, delay: 400 }}
                >
                  <Input
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search jobs, companies, roles..."
                      leftIcon="search"
                  />
                </MotiView>

              </SafeAreaView>

            </View>

            {/* Content Section */}
            <ScrollView className="flex-1 pb-20">
              <View className="px-6 mt-6">
                {/* Quick Actions */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600, delay: 600 }}
                >
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-xl font-bold text-gray-800">
                      Quick Actions
                    </Text>
                    <View className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-8"
                    contentContainerStyle={{
                      paddingRight: 20,
                      paddingLeft: 10,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {quickActions.map((action, i) => (
                      <MotiView
                        key={action.label}
                        from={{ opacity: 0, translateX: 50 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{ type: 'timing', duration: 500, delay: 700 + (i * 100) }}
                        className="mx-2"
                      >
                        <QuickActionCard
                          icon={action.icon}
                          label={action.label}
                          onPress={action.onPress}
                          className="bg-white shadow-lg shadow-blue-100 border-l-4 border-blue-500"
                        />
                      </MotiView>
                    ))}
                  </ScrollView>
                </MotiView>

                {/* Recommended Jobs */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600, delay: 800 }}
                >
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-xl font-bold text-gray-800">
                      Recommended For You
                    </Text>
                    <Text className="text-blue-600 font-semibold text-sm">
                      See all
                    </Text>
                  </View>

                  <View className="space-y-4">
                    {recommendedJobs.map((job, i) => (
                        <MotiView
                            key={i}
                            from={{ opacity: 0, translateY: 20, scale: 0.95 }}
                            animate={{ opacity: 1, translateY: 0, scale: 1 }}
                            transition={{ type: 'timing', duration: 500, delay: 1000 + (i * 150) }}
                        >
                          <JobCard
                              {...job}
                              onSave={() => {}}
                              onPress={() => handleJobPress(job)}
                              className="bg-white shadow-md shadow-gray-200 border border-gray-100 hover:shadow-lg transition-shadow"
                          />
                        </MotiView>
                    ))}
                  </View>
                </MotiView>

                {/* Stats Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600, delay: 1200 }}
                    className="mt-8 mb-6"
                >
                  <View className="bg-blue-800 rounded-2xl p-6 shadow-lg">
                    <Text className="text-white text-lg font-bold mb-2">
                      Your Job Hunt Progress
                    </Text>
                    <View className="flex-row justify-between">
                      <View className="items-center">
                        <Text className="text-white text-2xl font-bold">12</Text>
                        <Text className="text-emerald-100 text-sm">Applied</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-white text-2xl font-bold">3</Text>
                        <Text className="text-emerald-100 text-sm">Interviews</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-white text-2xl font-bold">24</Text>
                        <Text className="text-emerald-100 text-sm">Saved</Text>
                      </View>
                    </View>
                  </View>
                </MotiView>
              </View>
            </ScrollView>
          </View>
        </MotiView>
      </View>
    </View>
  );
}
