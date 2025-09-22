import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NotificationItem } from '../components/NotificationItem';
import { NavBar } from '../components/NavBar';
import { MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';

const initialNotifications = [
	{
		id: 1,
		title: 'New jobs for Python Developer in Colombo',
		description: '5 new jobs posted matching your skills.',
		timestamp: '2h ago',
		read: false,
	},
	{
		id: 2,
		title: 'Application status update',
		description: 'Your application for AI Engineer at VisionaryAI is being reviewed.',
		timestamp: '1d ago',
		read: false,
	},
	{
		id: 3,
		title: 'Welcome to JobLens!',
		description: 'Start exploring jobs and get matched instantly.',
		timestamp: '3d ago',
		read: true,
	},
];

export default function NotificationsScreen() {
	const [notifications, setNotifications] = useState(initialNotifications);
	const [activeTab, setActiveTab] = useState(0); // Home tab
	const navigation = useNavigation();

	const handleMarkRead = (id: number) => {
		setNotifications(notifications.map(n => (n.id === id ? { ...n, read: true } : n)));
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
				navigation.navigate('Profile');
				break;
		}
	};

	return (
		<View className="flex-1 bg-gradient-to-br from-blue-100 via-white to-blue-200">
			<MotiView
				from={{ opacity: 0, translateY: 40 }}
				animate={{ opacity: 1, translateY: 0 }}
				transition={{ type: 'timing', duration: 700 }}
				className="flex-1"
			>
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
					<View className="px-6 pt-8">
						<Text className="text-2xl font-bold text-blue-700 mb-4">Notifications</Text>
						{notifications.length === 0 ? (
							<Text className="text-center text-gray-400 mt-12">No notifications.</Text>
						) : (
							notifications.map(n => (
								<NotificationItem
									key={n.id}
									title={n.title}
									description={n.description}
									timestamp={n.timestamp}
									read={n.read}
									onMarkRead={() => handleMarkRead(n.id)}
								/>
							))
						)}
					</View>
				</ScrollView>
				<View className="absolute bottom-0 left-0 right-0 pb-2">
					<NavBar activeIndex={activeTab} onTabPress={handleTabPress} />
				</View>
			</MotiView>
		</View>
	);
}
