import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../../constants/config';

// Data Display
export const Avatar = ({ uri, size = 40, name }: { uri?: string, size?: number, name?: string }) => {
  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
    </View>
  );
};

export const StatusBadge = ({ status, type = 'default' }: { status: string, type?: 'success' | 'warning' | 'danger' | 'default' | 'primary' }) => {
  const getColors = () => {
    switch (type) {
      case 'success': return { bg: APP_COLORS.success + '20', text: APP_COLORS.success };
      case 'warning': return { bg: APP_COLORS.warning + '20', text: APP_COLORS.warning };
      case 'danger': return { bg: APP_COLORS.danger + '20', text: APP_COLORS.danger };
      default: return { bg: APP_COLORS.border, text: APP_COLORS.textLight };
    }
  };
  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

export const AmountDisplay = ({ amount, currency = '₹', style }: { amount: number, currency?: string, style?: any }) => (
  <Text style={[styles.amount, style]}>
    {currency}{amount.toLocaleString('en-IN')}
  </Text>
);

// Feedback
export const LoadingState = ({ message = 'Loading...' }: { message?: string }) => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={APP_COLORS.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

export const EmptyState = ({ title, description, icon = 'document-text-outline' }: { title: string, description?: string, icon?: string }) => (
  <View style={styles.centerContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name={icon as any} size={48} color={APP_COLORS.textLight} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {description && <Text style={styles.emptyDesc}>{description}</Text>}
  </View>
);

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: APP_COLORS.border,
  },
  avatarPlaceholder: {
    backgroundColor: APP_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: APP_COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: APP_COLORS.textLight,
    fontSize: 14,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: APP_COLORS.border + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: APP_COLORS.textLight,
    textAlign: 'center',
  }
});

