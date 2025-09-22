import React from "react";
import { View, Text } from "react-native";
import HomeScreen from "../src/screens/HomeScreen";
import LoginScreen from "../src/screens/LoginScreen";
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';
import "../global.css";


export default function Page() {
    try {
        const auth = useSelector((state: RootState) => state.auth);
        const { isAuthenticated, user } = auth || {};

        // For now, let's always show the LoginScreen to test
        // You can change this back to: isAuthenticated && user ? <HomeScreen /> : <LoginScreen />
        return <LoginScreen />;

    } catch (error) {
        // Fallback in case Redux isn't ready
        console.log("Redux error:", error);
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }
}
