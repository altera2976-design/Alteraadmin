import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps, ViewStyle } from 'react-native';
import { APP_COLORS } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';


interface InputProps extends TextInputProps {
  rightIcon?: string;
  onRightIconPress?: () => void;
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const FormInput = ({ label, error, containerStyle, style, rightIcon, onRightIconPress, ...props }: InputProps) => (
  <View style={[styles.inputContainer, containerStyle, { position: 'relative' }]}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error && styles.inputError, rightIcon && { paddingRight: 48 }, style]}
      placeholderTextColor={APP_COLORS.placeholder}
      {...props}
    />
    {rightIcon && (
      <TouchableOpacity
        onPress={onRightIconPress}
        style={{ position: 'absolute', right: 16, top: label ? 35 : 15 }}
      >
        <Ionicons name={rightIcon as any} size={20} color={APP_COLORS.textLight} />
      </TouchableOpacity>
    )}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);


export const SearchBar = ({ value, onChangeText, placeholder = 'Search...' }: { value: string, onChangeText: (text: string) => void, placeholder?: string }) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color={APP_COLORS.textLight} style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={APP_COLORS.placeholder}
    />
  </View>
);

export const Dropdown = ({ label, value, onPress, placeholder = 'Select an option' }: { label?: string, value?: string, onPress: () => void, placeholder?: string }) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.dropdownText, !value && { color: APP_COLORS.placeholder }]}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={20} color={APP_COLORS.textLight} />
    </TouchableOpacity>
  </View>
);

export const DatePickerField = ({ label, value, onPress }: { label?: string, value?: string, onPress: () => void }) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.dropdownText, !value && { color: APP_COLORS.placeholder }]}>
        {value || 'Select Date'}
      </Text>
      <Ionicons name="calendar-outline" size={20} color={APP_COLORS.textLight} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: APP_COLORS.card,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  inputError: {
    borderColor: APP_COLORS.danger,
  },
  errorText: {
    color: APP_COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: APP_COLORS.text,
  },
  dropdown: {
    backgroundColor: APP_COLORS.card,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: APP_COLORS.text,
  },
});



