import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

interface AdminQuickActionsProps {
  onNavigate: (path: string) => void;
}

export const AdminQuickActions = ({ onNavigate }: AdminQuickActionsProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.actionScroll}
      contentContainerStyle={styles.actionRowContainer}
    >
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onNavigate('/(app)/tabs/projects')}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.actionBtnText}>Projects</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtnSecondary}
        onPress={() => onNavigate('/(app)/quotation')}
        activeOpacity={0.8}
      >
        <Ionicons name="document-text" size={18} color={THEME.colors.primary} />
        <Text style={styles.actionBtnSecondaryText}>Quotations</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtnSecondary}
        onPress={() => onNavigate('/(app)/attendance')}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar" size={18} color={THEME.colors.primary} />
        <Text style={styles.actionBtnSecondaryText}>Attendance</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtnSecondary}
        onPress={() => onNavigate('/(app)/tabs/reports')}
        activeOpacity={0.8}
      >
        <Ionicons name="pie-chart" size={18} color={THEME.colors.primary} />
        <Text style={styles.actionBtnSecondaryText}>Reports</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actionScroll: {
    marginBottom: 16,
  },
  actionRowContainer: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7A131A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnSecondaryText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
});
