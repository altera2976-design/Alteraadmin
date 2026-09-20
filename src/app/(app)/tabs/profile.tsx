import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { APP_COLORS, API_URL } from '../../../constants/config';
import api from '../../../services/api';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable fields
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [department, setDepartment]   = useState('');
  const [designation, setDesignation] = useState('');

  // Initialize form when user data loads or edit mode opens
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setDepartment(user.department || '');
      setDesignation(user.designation || '');
    }
  }, [user, isEditing]);

  if (!user) return null;

  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        department: department.trim(),
        designation: designation.trim(),
      });

      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      Alert.alert('Success', 'Your profile details have been saved.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update profile. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setDepartment(user.department || '');
      setDesignation(user.designation || '');
    }
    setError('');
    setIsEditing(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
          const res = await api.post('/auth/profile-image', {
            imageBase64: result.assets[0].base64,
          });
          if (res.data.success) {
            setSuccessMsg('Profile image updated successfully.');
            // Update local user object to show new avatar immediately
            if (updateProfile) {
              await updateProfile({ name: user.name, phone: user.phone, department: user.department, designation: user.designation } as any);
            }
          }
        } catch (err: any) {
          setError(err?.response?.data?.message || 'Failed to upload image.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      setError('An error occurred while picking the image.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'My Profile'}</Text>
          <Text style={styles.headerSub}>
            {isEditing ? 'Update your personal information' : 'View and manage your account details'}
          </Text>
        </View>

        {!isEditing ? (
          <TouchableOpacity
            style={styles.editHeaderBtn}
            onPress={() => {
              setError('');
              setSuccessMsg('');
              setIsEditing(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.editHeaderBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelHeaderBtn}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelHeaderBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Messages */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={APP_COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={18} color={APP_COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* ── Avatar Card ── */}
          <View style={styles.avatarCard}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarCircle} activeOpacity={0.8}>
              {(user as any).avatar ? (
                <Image source={{ uri: `${API_URL.replace('/api', '')}/${(user as any).avatar}` }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileDes}>{user.designation || user.role || 'Employee'}</Text>

            <View style={styles.avatarMetaRow}>
              <View style={[styles.statusPill, user.status === 'ACTIVE' ? styles.pillActive : styles.pillInactive]}>
                <View style={[styles.statusDot, user.status === 'ACTIVE' ? styles.dotActive : styles.dotInactive]} />
                <Text style={[styles.statusText, user.status === 'ACTIVE' ? styles.textActive : styles.textInactive]}>
                  {user.status || 'ACTIVE'}
                </Text>
              </View>

              {user.employeeId ? (
                <View style={styles.empIdBadge}>
                  <Text style={styles.empIdBadgeText}>{user.employeeId}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Mode 1: Edit Mode ── */}
          {isEditing ? (
            <View style={styles.editSectionCard}>
              <Text style={styles.editSectionTitle}>EDIT DETAILS</Text>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="person-outline" size={18} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={(v) => { setName(v); setError(''); }}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="mail-outline" size={18} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(''); }}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="call-outline" size={18} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setError(''); }}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Department */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="business-outline" size={18} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={department}
                    onChangeText={(v) => { setDepartment(v); setError(''); }}
                    placeholder="e.g. Design, Operations, Sales"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Designation */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Designation</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="briefcase-outline" size={18} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={designation}
                    onChangeText={(v) => { setDesignation(v); setError(''); }}
                    placeholder="e.g. Interior Designer, Project Lead"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.editActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Mode 2: View Mode ── */
            <>
              {/* Contact Information */}
              <Section title="Contact Information">
                <Field label="Full Name" value={user.name} />
                <Field label="Email" value={user.email} />
                <Field label="Phone" value={user.phone || '—'} />
              </Section>

              {/* Job Information */}
              <Section title="Work Information">
                <Field label="Employee ID" value={user.employeeId || '—'} mono />
                <Field label="Department" value={user.department || '—'} />
                <Field label="Designation" value={user.designation || '—'} />
                <Field label="Role" value={user.role || 'EMPLOYEE'} />
                <Field label="Joining Date" value={formatDate(user.joiningDate)} />
                <Field label="Working Hours/Day" value={`${user.workingHours || 8} hours`} />
              </Section>

              {/* Bottom Quick Edit Button */}
              <TouchableOpacity
                style={styles.bottomEditBtn}
                onPress={() => {
                  setError('');
                  setSuccessMsg('');
                  setIsEditing(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.bottomEditBtnText}>Edit Profile Settings</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.fieldMono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.primary },

  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  editHeaderBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  cancelHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelHeaderBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  scrollContent: { padding: 16 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 14,
  },
  errorBannerText: {
    color: APP_COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 14,
  },
  successBannerText: {
    color: APP_COLORS.success,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Avatar card
  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: APP_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: APP_COLORS.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  profileName: { fontSize: 20, fontWeight: '700', color: APP_COLORS.text, marginBottom: 4 },
  profileDes: { fontSize: 14, color: APP_COLORS.textLight, marginBottom: 12 },

  avatarMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillActive: { backgroundColor: '#F0FDF4' },
  pillInactive: { backgroundColor: '#FEF2F2' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { backgroundColor: APP_COLORS.success },
  dotInactive: { backgroundColor: APP_COLORS.danger },
  statusText: { fontSize: 12, fontWeight: '700' },
  textActive: { color: APP_COLORS.success },
  textInactive: { color: APP_COLORS.danger },

  empIdBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  empIdBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Edit section
  editSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  editSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.primary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#111827',
    height: '100%',
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // View sections
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fieldLabel: { fontSize: 13, color: APP_COLORS.textLight, fontWeight: '500', flex: 1 },
  fieldValue: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  fieldMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: APP_COLORS.primary,
  },

  bottomEditBtn: {
    backgroundColor: APP_COLORS.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bottomEditBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
