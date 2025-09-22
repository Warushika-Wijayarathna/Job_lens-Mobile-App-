import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import Input from '../components/ui/Input';
import { FilterChip } from '../components/FilterChip';
import { JobCard } from '../components/JobCard';
import { NavBar } from '../components/NavBar';
import { MotiView } from 'moti';
import { useSelector, useDispatch } from 'react-redux';
import { fetchJobs } from '../store/slices/jobsSlice';
import { useNavigation } from '@react-navigation/native';
import type { RootState, AppDispatch } from '../store';

const filterOptions = {
  location: ['Remote', 'Colombo', 'London', 'New York'],
  salary: ['<$80k', '$80k-$120k', '>$120k'],
  experience: ['Entry', 'Mid', 'Senior'],
  workType: ['Full-time', 'Part-time', 'Contract'],
};

export default function JobListScreen() {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    location: '',
    salary: '',
    experience: '',
    workType: '',
  });
  const [activeTab, setActiveTab] = useState(1); // Jobs tab
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { jobs, isLoading, error } = useSelector((state: RootState) => state.jobs);

  useEffect(() => {
    dispatch(fetchJobs({}));
  }, [dispatch]);

  // Filter jobs based on search and selected filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
                         job.company.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = !selectedFilters.location ||
                           (job.location && job.location.includes(selectedFilters.location));
    const matchesSalary = !selectedFilters.salary ||
                         (job.salary && job.salary.includes(selectedFilters.salary.replace('$', '')));
    return matchesSearch && matchesLocation && matchesSalary;
  });

  const handleFilterSelect = (type: keyof typeof filterOptions, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [type]: prev[type] === value ? '' : value }));
  };

  const handleJobPress = (job: any) => {
    // @ts-ignore
    navigation.navigate('JobDetails', { jobId: job.id });
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    switch (index) {
      case 0:
        // @ts-ignore
        navigation.navigate('Home');
        break;
      case 1:
        // Already on Jobs screen
        break;
      case 2:
        // @ts-ignore
        navigation.navigate('ResumeMatch');
        break;
      case 3:
        // @ts-ignore
        navigation.navigate('Profile');
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
                    Job Listings 💼
                  </Text>
                  <Text className="text-blue-100 text-base mb-6">
                    Discover your perfect career opportunity
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
                    placeholder="Search jobs, roles, companies…"
                    leftIcon="search"
                  />
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
                {/* Filter Chips */}
                <View className="mb-6">
                  {Object.entries(filterOptions).map(([type, options]) => (
                    <View key={type} className="mb-4">
                      <Text className="text-lg font-bold text-gray-800 mb-2 capitalize">{type}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {options.map(option => (
                          <FilterChip
                            key={option}
                            label={option}
                            selected={selectedFilters[type as keyof typeof filterOptions] === option}
                            onPress={() => handleFilterSelect(type as keyof typeof filterOptions, option)}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  ))}
                </View>

                {/* Job List */}
                {isLoading ? (
                  <View className="items-center py-8">
                    <Text className="text-gray-600">Loading jobs...</Text>
                  </View>
                ) : error ? (
                  <Text style={{ color: 'red' }}>{error}</Text>
                ) : filteredJobs.length === 0 ? (
                  <Text className="text-center text-gray-400 mt-12">No jobs found.</Text>
                ) : (
                  filteredJobs.map((job, i) => (
                    <JobCard
                      key={job.id || i}
                      title={job.title}
                      company={job.company}
                      location={job.location || ''}
                      salary={job.salary || undefined}
                      onSave={() => {}}
                      // onPress={() => handleJobPress(job)}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </MotiView>
      </View>
    </View>
  );
}
