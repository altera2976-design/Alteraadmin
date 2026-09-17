import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { APP_COLORS } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export const PrimaryButton = ({ title, onPress, loading, disabled, style, textStyle, icon }: ButtonProps) => (
  <TouchableOpacity
    style={[styles.primary, (disabled || loading) && styles.disabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={APP_COLORS.card} />
    ) : (
      <>
        {icon && <Ionicons name={icon as any} size={20} color={APP_COLORS.card} style={styles.icon} />}
        <Text style={[styles.primaryText, textStyle]}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
);

export const SecondaryButton = ({ title, onPress, loading, disabled, style, textStyle, icon }: ButtonProps) => (
  <TouchableOpacity
    style={[styles.secondary, (disabled || loading) && styles.disabledSecondary, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={APP_COLORS.primary} />
    ) : (
      <>
        {icon && <Ionicons name={icon as any} size={20} color={APP_COLORS.primary} style={styles.icon} />}
        <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
);

export const ActionButton = ({ title, onPress, style, textStyle }: ButtonProps) => (
  <TouchableOpacity style={[styles.action, style]} onPress={onPress}>
    <Text style={[styles.actionText, textStyle]}>{title}</Text>
  </TouchableOpacity>
);

export const FloatingActionButton = ({ onPress, icon = 'add' }: { onPress: () => void, icon?: string }) => (
  <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.9}>
    <Ionicons name={icon as any} size={28} color={APP_COLORS.card} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  primary: {
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryText: { color: APP_COLORS.card, fontSize: 16, fontWeight: '600' },
  disabled: { backgroundColor: APP_COLORS.primaryLight },
  
  secondary: {
    backgroundColor: APP_COLORS.card,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: APP_COLORS.primary,
  },
  secondaryText: { color: APP_COLORS.primary, fontSize: 16, fontWeight: '600' },
  disabledSecondary: { borderColor: APP_COLORS.border, backgroundColor: APP_COLORS.background },
  
  action: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryLight,
  },
  actionText: { color: APP_COLORS.primary, fontSize: 14, fontWeight: '500' },
  
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: APP_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: { marginRight: 8 },
});

export const FilterButton = ({ onPress, active }: { onPress: () => void, active?: boolean }) => (
  <TouchableOpacity 
    style={[{ padding: 10, borderRadius: 12, backgroundColor: APP_COLORS.card, borderWidth: 1, borderColor: APP_COLORS.border }, active && { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.primaryLight }]} 
    onPress={onPress}
  >
    <Ionicons name="options-outline" size={20} color={active ? APP_COLORS.primary : APP_COLORS.textLight} />
  </TouchableOpacity>
);
