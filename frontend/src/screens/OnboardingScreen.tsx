import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Button from '../components/ui/Button';
import { ArrowRight, Search, FileText, ListChecks } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useNavigation } from '@react-navigation/native';

const slides = [
	{
		key: 'discover',
		title: 'Discover Jobs',
		description: 'Explore thousands of jobs tailored to your skills and interests.',
		illustration: <Search color="#3b82f6" size={64} />,
	},
	{
		key: 'ai-match',
		title: 'AI Resume Match',
		description: 'Let AI match your resume and skills to the best jobs for you.',
		illustration: <FileText color="#3b82f6" size={64} />,
	},
	{
		key: 'track',
		title: 'Track Applications',
		description: 'Keep tabs on jobs you\'ve saved and applied for, all in one place.',
		illustration: <ListChecks color="#3b82f6" size={64} />,
	},
];

export default function OnboardingScreen() {
	const [index, setIndex] = useState(0);
	const navigation = useNavigation();

	const handleNext = () => {
		if (index < slides.length - 1) setIndex(index + 1);
	};
	const handlePrev = () => {
		if (index > 0) setIndex(index - 1);
	};
	const handleFinish = () => {
		// Could store onboarding completion in AsyncStorage or state
		navigation.navigate('Login');
	};

	return (
		<View className="flex-1 bg-gradient-to-br from-blue-100 via-white to-blue-200 justify-center items-center px-6">
			<View className="items-center mb-8">
				<Image
					source={require('../../assets/icon.png')}
					className="w-16 h-16 mb-2"
					accessibilityLabel="JobLens Logo"
				/>
				<Text className="text-xl font-bold text-blue-700 text-center tracking-tight">
					Find Your Future with AI
				</Text>
			</View>
			<View className="w-full max-w-sm">
				<AnimatePresence>
					<MotiView
						key={slides[index].key}
						from={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ type: 'timing', duration: 500 }}
						className="bg-white rounded-3xl shadow-lg p-8 items-center"
					>
						<View className="mb-6">{slides[index].illustration}</View>
						<Text className="text-xl font-bold text-blue-700 mb-2 text-center tracking-tight">
							{slides[index].title}
						</Text>
						<Text className="text-base text-gray-600 mb-6 text-center">
							{slides[index].description}
						</Text>
						<View className="flex-row justify-between w-full mt-2">
							{index > 0 ? (
								<TouchableOpacity
									onPress={handlePrev}
									className="px-4 py-2 rounded-xl bg-gray-100"
									accessibilityLabel="Previous Slide"
								>
									<Text className="text-blue-600 font-semibold">Back</Text>
								</TouchableOpacity>
							) : (
								<View className="w-20" />
							)}
							{index < slides.length - 1 ? (
								<Button
									title="Next"
									style={{
										paddingHorizontal: 24,
										paddingVertical: 8,
										backgroundColor: '#2563eb',
										borderRadius: 12,
										flexDirection: 'row',
										alignItems: 'center',
									}}
									onPress={handleNext}
									rightSlot={<ArrowRight color="#fff" size={20} />}
								/>
							) : (
								<View style={{ flexDirection: 'column', alignItems: 'center' }}>
									<Button
										title="Get Started"
										style={{
											paddingHorizontal: 24,
											paddingVertical: 8,
											backgroundColor: '#2563eb',
											borderRadius: 12,
											flexDirection: 'row',
											alignItems: 'center',
											marginBottom: 8,
										}}
										onPress={() => navigation.navigate('Login')}
										rightSlot={<ArrowRight color="#fff" size={20} />}
									/>
									<Button
										title="Sign Up"
										style={{
											paddingHorizontal: 24,
											paddingVertical: 8,
											backgroundColor: '#22c55e',
											borderRadius: 12,
											flexDirection: 'row',
											alignItems: 'center',
											marginBottom: 8,
										}}
										onPress={() => navigation.navigate('Register')}
									/>
									<Button
										title="Forgot Password?"
										style={{
											paddingHorizontal: 24,
											paddingVertical: 8,
											backgroundColor: '#f59e42',
											borderRadius: 12,
											flexDirection: 'row',
											alignItems: 'center',
										}}
										onPress={() => navigation.navigate('ForgotPassword')}
									/>
								</View>
							)}
						</View>
						<View className="flex-row justify-center mt-6">
							{slides.map((_, i) => (
								<View
									key={i}
									className={i === index ? "w-2 h-2 mx-1 rounded-full bg-blue-600" : "w-2 h-2 mx-1 rounded-full bg-gray-300"}
									accessibilityLabel={
										i === index ? 'Current Slide' : 'Slide Indicator'
									}
								/>
							))}
						</View>
					</MotiView>
				</AnimatePresence>
			</View>
		</View>
	);
}
