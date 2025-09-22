import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import Button from '../components/ui/Button';
import FileUpload from '../components/ui/FileUpload';
import { JobCard } from '../components/JobCard';
import { NavBar } from '../components/NavBar';
import { Sparkles } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSelector, useDispatch } from 'react-redux';
import { uploadResumeForMatching, clearUserError } from '../store/slices/userSlice';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import type { RootState, AppDispatch } from '../store';

export default function ResumeMatchScreen() {
	const dispatch = useDispatch<AppDispatch>();
	const navigation = useNavigation();
	const currentUser = useSelector((state: RootState) => state.auth.user);
	const { recommendations, isLoading, error } = useSelector((state: RootState) => state.user);
	const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
	const [activeTab, setActiveTab] = useState(2); // Match tab
	const [showRecommendedJobs, setShowRecommendedJobs] = useState(false);

	// Sample recommended jobs to show when no AI recommendations are available
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

	useEffect(() => {
		// Clear any previous errors when component mounts
		dispatch(clearUserError());
	}, [dispatch]);

	const handleFileSelect = (file: DocumentPicker.DocumentPickerResult) => {
		setUploadedFile(file);
		console.log('Selected file:', file);
	};

	const handleMatch = async () => {
		if (!currentUser?.id) {
			Alert.alert('Error', 'Please log in to continue');
			return;
		}

		try {
			// Check if user uploaded a file
			if (uploadedFile && !uploadedFile.canceled && uploadedFile.assets && uploadedFile.assets.length > 0) {
				const file = uploadedFile.assets[0];
				console.log('Processing resume:', file.name);

				// Convert DocumentPicker file format to API expected format
				const fileForUpload = {
					uri: file.uri,
					name: file.name,
					type: file.mimeType || 'application/pdf'
				};

				// Upload resume for AI matching
				const result = await dispatch(uploadResumeForMatching({
					userId: currentUser.id,
					file: fileForUpload
				})).unwrap();

				Alert.alert('Success!', 'Your resume has been processed and matched with relevant jobs.');
				setShowRecommendedJobs(true); // Show recommended jobs after processing

			} else {
				Alert.alert('Input Required', 'Please upload your resume to get AI recommendations.');
			}
		} catch (error: any) {
			console.error('AI Matching error:', error);
			Alert.alert('Error', error || 'Failed to process your request. Please try again.');
			// Show recommended jobs even if AI matching fails
			setShowRecommendedJobs(true);
		}
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
				// Already on ResumeMatch screen
				break;
			case 3:
				navigation.navigate('Profile');
				break;
		}
	};

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
										AI Resume Match 🤖
									</Text>
									<Text className="text-blue-100 text-base mb-6">
										Let AI find the perfect jobs for your skills
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

								{/* File Upload Section */}
								<MotiView
									from={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ type: 'timing', duration: 600, delay: 400 }}
									className="mb-6"
								>
									<FileUpload
										onFileSelect={handleFileSelect}
										placeholder="Upload your CV/Resume for AI matching"
									/>
								</MotiView>

								<MotiView
									from={{ opacity: 0, translateY: 30 }}
									animate={{ opacity: 1, translateY: 0 }}
									transition={{ type: 'timing', duration: 600, delay: 700 }}
								>
									<Button
										title={isLoading ? "Processing..." : "AI Match"}
										style={{
											width: '100%',
											backgroundColor: '#2563eb',
											borderRadius: 16,
											paddingVertical: 12,
											marginBottom: 24,
											flexDirection: 'row',
											alignItems: 'center',
											justifyContent: 'center',
										}}
										onPress={handleMatch}
										disabled={isLoading}
										rightSlot={
											isLoading ? <ActivityIndicator color="#fff" size={20} /> : <Sparkles color="#fff" size={20} />
										}
									/>
								</MotiView>

								{isLoading ? (
									<View className="items-center py-8">
										<ActivityIndicator size="large" color="#2563eb" />
										<Text className="text-gray-600 mt-2">Finding matching jobs...</Text>
									</View>
								) : error ? (
									<View>
										<Text style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
										{/* Show recommended jobs even when there's an error */}
										{showRecommendedJobs && (
											<View>
												<Text className="text-xl font-bold text-gray-800 mb-4">
													Recommended Jobs For You ({recommendedJobs.length})
												</Text>
												{recommendedJobs.map((job, i) => (
													<MotiView
														key={i}
														from={{ opacity: 0, translateY: 20, scale: 0.95 }}
														animate={{ opacity: 1, translateY: 0, scale: 1 }}
														transition={{ type: 'timing', duration: 500, delay: i * 150 }}
													>
														<JobCard
															title={job.title}
															company={job.company}
															location={job.location}
															salary={job.salary}
															saved={job.saved}
															onSave={() => {}}
															onPress={() => handleJobPress(job)}
														/>
													</MotiView>
												))}
											</View>
										)}
									</View>
								) : recommendations && recommendations.length > 0 ? (
									<View>
										<Text className="text-xl font-bold text-gray-800 mb-4">
											AI Matched Jobs ({recommendations.length})
										</Text>
										{recommendations.map((rec, i) => (
											<JobCard
												key={i}
												title={rec.job.title}
												company={rec.job.company}
												location={rec.job.location || ''}
												salary={rec.job.salary || undefined}
												onSave={() => {}}
												onPress={() => handleJobPress({
													title: rec.job.title,
													company: rec.job.company,
													location: rec.job.location || '',
													salary: rec.job.salary || '',
													saved: false
												})}
											/>
										))}
									</View>
								) : showRecommendedJobs ? (
									<View>
										<Text className="text-xl font-bold text-gray-800 mb-4">
											Recommended Jobs For You ({recommendedJobs.length})
										</Text>
										{recommendedJobs.map((job, i) => (
											<MotiView
												key={i}
												from={{ opacity: 0, translateY: 20, scale: 0.95 }}
												animate={{ opacity: 1, translateY: 0, scale: 1 }}
												transition={{ type: 'timing', duration: 500, delay: i * 150 }}
											>
												<JobCard
													title={job.title}
													company={job.company}
													location={job.location}
													salary={job.salary}
													saved={job.saved}
													onSave={() => {}}
													onPress={() => handleJobPress(job)}
												/>
											</MotiView>
										))}
									</View>
								) : (
									<Text className="text-center text-gray-400 mt-12">Upload your resume to get personalized job recommendations!</Text>
								)}
							</View>
						</ScrollView>
					</View>
				</MotiView>
			</View>
		</View>
	);
}
