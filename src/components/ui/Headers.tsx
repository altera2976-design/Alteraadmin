import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { APP_COLORS } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const LogoHeader = () => (
  <View style={styles.logoContainer}>
    {/* Using text since logo asset might not be available yet */}
    <Text style={styles.brandName}>Altera Interior</Text>
    <Text style={styles.tagline}>THE MODERN HOME MAKER</Text>
  </View>
);

export const AppHeader = ({ title, rightIcon, onRightPress, showBack }: { title: string, rightIcon?: string, onRightPress?: () => void, showBack?: boolean }) => {
  const router = useRouter();
  return (
    <View style={styles.appHeader}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
      ) : <View style={styles.placeholder} />}
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress} style={styles.headerIcon}>
          <Ionicons name={rightIcon as any} size={24} color={APP_COLORS.primary} />
        </TouchableOpacity>
      ) : <View style={styles.placeholder} />}
    </View>
  );
};

export const ScreenTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <View style={styles.screenTitleContainer}>
    <Text style={styles.screenTitle}>{title}</Text>
    {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
  </View>
);

export const SectionHeader = ({ title, actionTitle, onActionPress }: { title: string, actionTitle?: string, onActionPress?: () => void }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionTitle && onActionPress && (
      <TouchableOpacity onPress={onActionPress}>
        <Text style={styles.sectionAction}>{actionTitle}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  logoContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 10,
    color: APP_COLORS.textLight,
    letterSpacing: 2,
    marginTop: 2,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: APP_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  headerIcon: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  screenTitleContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 15,
    color: APP_COLORS.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.primary,
  }
});
