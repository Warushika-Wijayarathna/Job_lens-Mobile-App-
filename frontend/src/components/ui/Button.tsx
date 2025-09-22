import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Text, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  leftSlot,
  rightSlot,
}) => {
  const buttonStyle = [
    styles.base,
    variant === 'primary' ? styles.primary : styles.outline,
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    variant === 'outline' ? styles.outlineText : styles.primaryText,
    (leftSlot || rightSlot) ? styles.textWithIcon : undefined,
  ];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#1a1a1a' : '#fff'} />
      ) : (
        <>
          {leftSlot}
          <Text style={textStyle}>{title}</Text>
          {rightSlot}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  outline: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
  primaryText: {
    color: '#ffffff',
  },
  outlineText: {
    color: '#000000',
  },
  textWithIcon: {
    marginLeft: 8,
  },
});

export default Button;
