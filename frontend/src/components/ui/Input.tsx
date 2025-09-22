import React, {useState} from 'react';
import {TextInput, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

export interface InputProps {
    value: string,
    onChangeText: (text: string) => void,
    placeholder?: string,
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url',
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters',
    secureTextEntry?: boolean,
    leftIcon?: keyof typeof Ionicons.glyphMap,
    error?: string,
    testID?: string,
}

const Input: React.FC<InputProps> = ({
                                         value,
                                         onChangeText,
                                         placeholder,
                                         keyboardType = 'default',
                                         autoCapitalize = 'none',
                                         secureTextEntry = false,
                                         leftIcon,
                                         error,
                                         testID,
                                     }) => {
    const [show, setShow] = useState<boolean>(!secureTextEntry);
    const isSecure = secureTextEntry && !show;

    return (
        <View>
            <View style={styles.container}>
                {leftIcon ? (
                    <Ionicons name={leftIcon} size={20} color="#666" style={styles.leftIcon}/>
                ) : null}
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={isSecure}
                    testID={testID}
                />
                {secureTextEntry ? (
                    <TouchableOpacity onPress={() => setShow(!show)} accessibilityRole="button">
                        <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={20} color="#666"/>
                    </TouchableOpacity>
                ) : null}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        height: 56,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e1e5e9',
    },
    leftIcon: {
        marginRight: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        paddingVertical: 8,
    },
    error: {
        color: '#d32f2f',
        fontSize: 14,
        marginTop: 8,
        marginLeft: 4,
        paddingHorizontal: 4,
    },
});

export default Input;
