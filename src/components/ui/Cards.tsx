import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { APP_COLORS } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const BaseCard = ({ children, style, onPress }: CardProps) => {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

export const StatCard = ({ title, value, icon, color = APP_COLORS.primary, style }: { title: string, value: string | number, icon: string, color?: string, style?: ViewStyle }) => (
  <BaseCard style={[styles.statCard, style] as any}>
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <View style={styles.statTextContainer}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </BaseCard>
);

export const ListCard = ({ title, subtitle, rightElement, onPress, style }: { title: string, subtitle?: string, rightElement?: React.ReactNode, onPress?: () => void, style?: ViewStyle }) => (
  <BaseCard style={[styles.listCard, style] as any} onPress={onPress}>
    <View style={styles.listContent}>
      <Text style={styles.listTitle}>{title}</Text>
      {subtitle && <Text style={styles.listSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement && <View>{rightElement}</View>}
  </BaseCard>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: APP_COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 229, 229, 0.4)',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: APP_COLORS.textLight,
  },
  listCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: APP_COLORS.textLight,
  }
});


