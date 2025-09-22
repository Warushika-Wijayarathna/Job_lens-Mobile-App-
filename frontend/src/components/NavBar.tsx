import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Home, Search, FileText, User } from 'lucide-react-native';
import { twMerge } from 'tailwind-merge';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MotiView } from 'moti';

interface NavBarProps {
  activeIndex?: number;
  onTabPress?: (index: number) => void;
}

const tabs = [
  { label: 'Home', icon: Home, route: 'Home' },
  { label: 'Jobs', icon: Search, route: 'Jobs' },
  { label: 'Match', icon: FileText, route: 'ResumeMatch' },
  { label: 'Profile', icon: User, route: 'Profile' },
];

export const NavBar: React.FC<NavBarProps> = ({ activeIndex: propActiveIndex, onTabPress }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeIndex, setActiveIndex] = useState(0);

  // Update active index based on current route
  useEffect(() => {
    const currentTabIndex = tabs.findIndex(tab => route.name === tab.route);
    if (currentTabIndex !== -1) {
      setActiveIndex(currentTabIndex);
    }
  }, [route.name]);

  // Use prop activeIndex if provided, otherwise use internal state
  const currentActiveIndex = propActiveIndex !== undefined ? propActiveIndex : activeIndex;

  const handleTabPress = (index: number) => {
    if (onTabPress) {
      onTabPress(index);
    } else {
      navigation.navigate(tabs[index].route);
    }
    setActiveIndex(index);
  };

  return (
    <View className="flex-row bg-white shadow-lg py-3 justify-between items-center w-full self-center mb-2">
      {tabs.map((tab, i) => {
        const IconComponent = tab.icon;
        const isActive = i === currentActiveIndex;

        return (
          <TouchableOpacity
            key={tab.label}
            onPress={() => handleTabPress(i)}
            className="flex-1 items-center py-2"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <MotiView
              animate={{
                backgroundColor: isActive ? '#dbeafe' : 'transparent',
                scale: isActive ? 1.1 : 1,
              }}
              transition={{
                type: 'timing',
                duration: 300,
                backgroundColor: {
                  type: 'timing',
                  duration: 400,
                },
                scale: {
                  type: 'spring',
                  damping: 15,
                  stiffness: 150,
                }
              }}
              className="items-center py-2 px-3 rounded-xl"
            >
              <MotiView
                animate={{
                  scale: isActive ? 1.2 : 1,
                  rotate: isActive ? '10deg' : '0deg',
                }}
                transition={{
                  type: 'spring',
                  damping: 12,
                  stiffness: 100,
                }}
              >
                <IconComponent
                  size={22}
                  color={isActive ? '#2563eb' : '#9ca3af'}
                />
              </MotiView>

              <MotiView
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  translateY: isActive ? -2 : 0,
                }}
                transition={{
                  type: 'spring',
                  damping: 15,
                  stiffness: 120,
                }}
              >
                <Text className={twMerge(
                  'text-xs mt-1',
                  isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
                )}>
                  {tab.label}
                </Text>
              </MotiView>
            </MotiView>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
