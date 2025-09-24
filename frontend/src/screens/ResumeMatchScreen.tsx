import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import Button from '../components/ui/Button';
import FileUpload from '../components/ui/FileUpload';
import { JobCard } from '../components/JobCard';
import { Sparkles } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSelector, useDispatch } from 'react-redux';
import { uploadResumeForMatching, clearUserError } from '../store/slices/userSlice';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { extractPdfText } from '../utils/pdf';
import type { RootState, AppDispatch } from '../store';

export default function ResumeMatchScreen() {
	const dispatch = useDispatch<AppDispatch>();
	const navigation = useNavigation<any>();
	const currentUser = useSelector((state: RootState) => state.auth.user);
	const { recommendations, isLoading, error } = useSelector((state: RootState) => state.user);
	const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
	const [showRecommendedJobs, setShowRecommendedJobs] = useState(false);
	const [processingStep, setProcessingStep] = useState<'idle' | 'uploading' | 'extracting' | 'matching'>('idle');

	useEffect(() => {
		// Clear any previous errors when component mounts
		dispatch(clearUserError());
	}, [dispatch]);

	const handleFileSelect = async (file: DocumentPicker.DocumentPickerResult) => {
		setUploadedFile(file);
		console.log('Selected file:', file);

		// Automatically start the matching process when a file is selected
		if (file && !file.canceled && file.assets && file.assets.length > 0) {
			await processResume(file);
		}
	};

	// Function to process resume automatically after selection
	const processResume = async (file: DocumentPicker.DocumentPickerResult) => {
		if (!currentUser?.id) {
			Alert.alert('Error', 'Please log in to continue');
			return;
		}

		try {
			// Check if user uploaded a file
			if (file && !file.canceled && file.assets && file.assets.length > 0) {
				const fileAsset = file.assets[0];
				setProcessingStep('uploading');
				console.log('Processing resume:', fileAsset.name);

				// Convert DocumentPicker file format to API expected format
				const fileForUpload = {
					uri: fileAsset.uri,
					name: fileAsset.name,
					type: fileAsset.mimeType || 'application/pdf'
				};

				// Try extracting on web to avoid double extraction
				setProcessingStep('extracting');
				let resumeText: string | undefined = undefined;
				if (Platform.OS === 'web') {
					try {
						const text = await extractPdfText(fileAsset.uri);
						if (text && text.length > 0) {
							resumeText = text;
						}
					} catch (e) {
						console.warn('Web resume text extraction failed:', e);
					}
				}

				// Upload resume for content extraction and AI matching
				setProcessingStep('matching');
				await dispatch(uploadResumeForMatching({
					userId: currentUser.id,
					file: fileForUpload,
					resumeText,
				})).unwrap();

				setProcessingStep('idle');
				// Do not toggle sample jobs after AI action; only show real results
				setShowRecommendedJobs(false);
				Alert.alert('Success!', 'Your resume has been processed and matched with relevant jobs.');
			}
		} catch (error: any) {
			console.error('AI Matching error:', error);
			setProcessingStep('idle');
			Alert.alert('Error', error.message || 'Failed to process your request. Please try again.');
			// Do not show sample jobs on error
			setShowRecommendedJobs(false);
		}
	};

	// Manual trigger for the matching process
	const handleMatch = async () => {
		if (uploadedFile) {
			await processResume(uploadedFile);
		} else {
			Alert.alert('Input Required', 'Please upload your resume to get AI recommendations.');
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
				category: 'Technology',
				matchPercentage: job.matchPercentage || job.match_percentage
			}
		});
	};

	// Display the current processing step message
	const getProcessingMessage = () => {
		switch (processingStep) {
			case 'uploading':
				return 'Uploading your resume...';
			case 'extracting':
				return 'Extracting content from your resume...';
			case 'matching':
				return 'Finding matching jobs...';
			default:
				return 'Processing your request...';
		}
	};

	// Helper to derive match percentage from backend data
	const toMatchPercentage = (rec: any): number | undefined => {
		if (typeof rec?.match_percentage === 'number') return rec.match_percentage;
		if (typeof rec?.match_score === 'number') return Math.round(rec.match_score);
		return undefined;
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
										disabled={isLoading || processingStep !== 'idle'}
										rightSlot={
											isLoading ? <ActivityIndicator color="#fff" size={20} /> : <Sparkles color="#fff" size={20} />
										}
									/>
								</MotiView>

								{(isLoading || processingStep !== 'idle') ? (
									<View className="items-center py-8">
										<ActivityIndicator size="large" color="#2563eb" />
										<Text className="text-gray-600 mt-2">{getProcessingMessage()}</Text>
									</View>
								) : error ? (
									// Show only the error and guidance; no dummy/sample jobs
									<View>
										<Text style={{ color: 'red', textAlign: 'center', marginBottom: 8 }}>{error}</Text>
										<Text className="text-center text-gray-500">Please try again or upload a different resume.</Text>
									</View>
								) : (recommendations && recommendations.length > 0) ? (
									<View>
										<Text className="text-xl font-bold text-gray-800 mb-4">
											AI Matched Jobs ({recommendations.length})
										</Text>
										{recommendations.map((rec, i) => {
											const pct = toMatchPercentage(rec);
											return (
												<JobCard
													key={i}
													title={rec.job.title}
													company={rec.job.company}
													location={rec.job.location || ''}
													salary={rec.job.salary || undefined}
													matchPercentage={pct}
													onSave={() => {}}
													onPress={() => handleJobPress({
														title: rec.job.title,
														company: rec.job.company,
														location: rec.job.location || '',
														salary: rec.job.salary || '',
														match_percentage: pct,
														saved: false
													})}
												/>
											);
										})}
									</View>
								) : (
									// Neutral empty state: no AI recommendations to show
									<Text className="text-center text-gray-400 mt-12">No AI recommendations yet. Upload your resume and try again.</Text>
								)}
							</View>
						</ScrollView>
					</View>
				</MotiView>
			</View>
		</View>
	);
}
