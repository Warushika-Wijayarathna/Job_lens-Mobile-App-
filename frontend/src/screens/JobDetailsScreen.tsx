import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Linking, SafeAreaView, Alert, Share } from 'react-native';
import Button from '../components/ui/Button';
import { Tag } from '../components/Tag';
import { NavBar } from '../components/NavBar';
import { Bookmark, Building2, MapPin, DollarSign, Briefcase, Mail, Copy } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootState } from '../store';

export default function JobDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobs } = useSelector((state: RootState) => state.jobs);

  // Get job from route params or use first job as fallback
  const jobData = route.params?.jobData;
  const jobId = route.params?.jobId;
  const job = jobData || (jobId ? jobs.find(j => j.id === jobId) : jobs[0]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(1); // Jobs tab

  // Mock job data if no jobs available
  const mockJob = {
    id: '1',
    title: 'Senior React Developer',
    company: 'TechCorp',
    company_logo: null,
    location: 'Remote',
    url: 'https://example.com/apply',
    description: 'We are looking for a senior React developer to join our team. You will be responsible for building modern web applications using React, TypeScript, and other cutting-edge technologies.',
    created_at: new Date().toISOString(),
    external_id: null,
    job_type: 'Full-time',
    salary: '$80k - $120k',
    category: 'Technology'
  };

  const applyEmail = "hr@company.com";

  const displayJob = job || mockJob;

  // Mock data for properties not in Job type
  const mockSkills = ['React', 'TypeScript', 'Node.js', 'GraphQL'];

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
        navigation.navigate('Profile');
        break;
    }
  };

  const handleApplyNow = async () => {
    const subject = `Application for ${displayJob.title} Position`;
    const body = `Dear Hiring Manager,

I am writing to express my interest in the ${displayJob.title} position at ${displayJob.company}. I came across this opportunity through JobLens and believe my skills and experience make me a strong candidate for this role.

I am particularly excited about this opportunity because:
• The role aligns perfectly with my career goals and expertise
• ${displayJob.company} has an excellent reputation in the industry
• The position offers the opportunity to work with cutting-edge technologies

I have attached my resume for your review and would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team's success.

Thank you for considering my application. I look forward to hearing from you soon.

Best regards,
[Your Name]
[Your Phone Number]
[Your Email]

---
Applied via JobLens - Your AI-Powered Job Matching Platform`;

    try {
      // First try expo-mail-composer
      const isAvailable = await MailComposer.isAvailableAsync();

      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [applyEmail],
          subject: subject,
          body: body,
          isHtml: false,
        });
        return;
      }
    } catch (error) {
      console.log('Mail composer failed, trying alternatives...');
    }

    // If mail composer fails, show options to user
    Alert.alert(
      'Apply for Job',
      `How would you like to apply for the ${displayJob.title} position?`,
      [
        {
          text: 'Copy Email Content',
          onPress: () => copyEmailContent(subject, body),
        },
        {
          text: 'Copy Email Address',
          onPress: () => copyEmailAddress(),
        },
        {
          text: 'Share Job',
          onPress: () => shareJob(),
        },
        {
          text: 'Open Website',
          onPress: () => Linking.openURL(displayJob.url),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const copyEmailContent = async (subject: string, body: string) => {
    const emailContent = `To: ${applyEmail}
Subject: ${subject}

${body}`;

    try {
      await Clipboard.setString(emailContent);
      Alert.alert(
        'Email Content Copied!',
        `The complete email has been copied to your clipboard. You can now paste it into any email app.\n\nEmail: ${applyEmail}`,
        [
          {
            text: 'Open Email App',
            onPress: () => {
              // Try to open default email app
              Linking.openURL('mailto:').catch(() => {
                Alert.alert('Info', 'Please open your email app manually and paste the content.');
              });
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const copyEmailAddress = async () => {
    try {
      await Clipboard.setString(applyEmail);
      Alert.alert('Email Address Copied!', `${applyEmail} has been copied to your clipboard.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy email address');
    }
  };

  const shareJob = async () => {
    try {
      const shareContent = {
        message: `Check out this job opportunity: ${displayJob.title} at ${displayJob.company}\n\nLocation: ${displayJob.location}\nSalary: ${displayJob.salary}\n\nApply at: ${applyEmail}\n\nFound via JobLens - Your AI-Powered Job Matching Platform`,
        title: `${displayJob.title} - ${displayJob.company}`,
      };

      await Share.share(shareContent);
    } catch (error) {
      console.error('Share failed:', error);
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
                    Job Details 💼
                  </Text>
                  <Text className="text-blue-100 text-base mb-6">
                    Everything you need to know about this opportunity
                  </Text>
                </MotiView>
              </SafeAreaView>
            </View>

            {/* Content Section */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 90 }}
              className="flex-1"
            >
              <View className="px-6 mt-6">
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 600, delay: 400 }}
                  className="mb-6"
                >
                  <View className="bg-white rounded-2xl p-6 shadow-md">
                    <View className="flex-row items-center mb-4">
                      {displayJob.company_logo ? (
                        <Image source={{ uri: displayJob.company_logo }} className="w-14 h-14 rounded-xl mr-4" />
                      ) : (
                        <View className="w-14 h-14 rounded-xl bg-gray-200 items-center justify-center mr-4">
                          <Text className="text-lg font-bold text-gray-400">JL</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-blue-700" numberOfLines={1}>{displayJob.title}</Text>
                        <View className="flex-row items-center mt-1">
                          <Building2 color="#3b82f6" size={16} />
                          <Text className="text-sm text-gray-600 ml-1" numberOfLines={1}>{displayJob.company}</Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap mb-4">
                      <View className="flex-row items-center mr-4 mb-2">
                        <DollarSign color="#3b82f6" size={16} />
                        <Text className="text-sm text-gray-700 ml-1">{displayJob.salary}</Text>
                      </View>
                      <View className="flex-row items-center mr-4 mb-2">
                        <MapPin color="#3b82f6" size={16} />
                        <Text className="text-sm text-gray-700 ml-1">{displayJob.location}</Text>
                      </View>
                      <View className="flex-row items-center mb-2">
                        <Briefcase color="#3b82f6" size={16} />
                        <Text className="text-sm text-gray-700 ml-1">{displayJob.job_type}</Text>
                      </View>
                    </View>
                  </View>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, translateY: 30 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 600, delay: 600 }}
                  className="mb-6"
                >
                  <View className="bg-white rounded-2xl p-6 shadow-md">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Job Description</Text>
                    <Text className="text-sm text-gray-600 leading-relaxed">
                      {displayJob.description}
                    </Text>
                  </View>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, translateY: 30 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 600, delay: 800 }}
                  className="mb-6"
                >
                  <View className="bg-white rounded-2xl p-6 shadow-md">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Required Skills</Text>
                    <View className="flex-row flex-wrap">
                      {mockSkills.map((skill: string) => (
                        <Tag key={skill} label={skill} color="blue" />
                      ))}
                    </View>
                  </View>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, translateY: 30 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 600, delay: 1000 }}
                >
                  <Button
                    title="Apply Now"
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      borderRadius: 16,
                      paddingVertical: 12,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={handleApplyNow}
                    leftSlot={<Briefcase color="#fff" size={20} />}
                  />
                </MotiView>
              </View>
            </ScrollView>
          </View>
        </MotiView>

        <View className="absolute bottom-0 left-0 right-0 pb-2">
          <NavBar activeIndex={activeTab} onTabPress={handleTabPress} />
        </View>
      </View>
    </View>
  );
}
