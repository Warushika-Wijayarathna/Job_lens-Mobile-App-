// src/components/ErrorBoundary.tsx
import React from "react";
import { View, Text } from "react-native";

export default class ErrorBoundary extends React.Component<{ children?: React.ReactNode }> {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, info: any) {
        console.error("ErrorBoundary caught an error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "red" }}>Something went wrong:</Text>
                    <Text>{String(this.state.error)}</Text>
                </View>
            );
        }
        return this.props.children;
    }
}
