import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, ImageBackground } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { authService } from '../../services/authService';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  // 60-second cooldown timer for Resend OTP
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleResendOtp = async () => {
    if (countdown > 0 || resendingOtp) return;
    if (!email) {
      setError('Email address is missing. Please go back and try again.');
      return;
    }

    setResendingOtp(true);
    setError('');
    setSuccessInfo('');

    try {
      const res = await authService.forgotPassword(email as string);
      if (res.success) {
        setCountdown(60);
        setIsOtpVerified(false);
        setResetToken(null);
        Alert.alert('OTP Sent', 'A new 6-digit verification code has been sent to your email.');
      } else {
        setError(res.message || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (otp.trim().length !== 6) {
      setError('OTP must be exactly 6 digits.');
      return;
    }

    setVerifyingOtp(true);
    setError('');
    setSuccessInfo('');

    try {
      const res = await authService.verifyOtp(email as string, otp.trim());
      if (res.success) {
        setIsOtpVerified(true);
        if (res.email) {
          setVerifiedEmail(res.email);
        }
        if (res.resetToken) {
          setResetToken(res.resetToken);
        }
        setSuccessInfo('Verification code confirmed! Now enter your new password.');
      } else {
        setError(res.message || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isOtpVerified && !otp.trim()) {
      setError('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const targetEmail = verifiedEmail || (email as string);
      const res = await authService.resetPassword(
        targetEmail,
        isOtpVerified ? undefined : otp.trim(),
        newPassword,
        resetToken || undefined,
        confirmPassword || undefined
      );
      if (res.success) {
        Alert.alert('Success', 'Your password has been reset successfully. You can now login.');
        // Navigate back to login screen with the email pre-filled
        router.replace({ pathname: '/(auth)/login', params: { registeredEmail: targetEmail } });
      } else {
        setError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../../../assets/images/login-bg.jpg')} style={styles.bgImage} resizeMode="cover">
      <View style={styles.overlay} />
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={32} color="#7A131A" />
              </View>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>Enter the 6-digit OTP sent to <Text style={{fontWeight:'700'}}>{email}</Text> along with your new password.</Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#D60000" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {successInfo ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.successText}>{successInfo}</Text>
              </View>
            ) : null}

            {/* OTP Input with inline Verify button or status */}
            <View style={styles.inputWrapper}>
              <Ionicons name="keypad-outline" size={20} color={isOtpVerified ? '#10B981' : '#757575'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP Code"
                placeholderTextColor="#999999"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                editable={!isOtpVerified}
                onChangeText={(v) => { setOtp(v); setError(''); }}
              />
              {isOtpVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.verifyInlineBtn, otp.length !== 6 && styles.verifyInlineBtnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={verifyingOtp || otp.length !== 6}
                  activeOpacity={0.7}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator size="small" color="#7A131A" />
                  ) : (
                    <Text style={[styles.verifyInlineBtnText, otp.length !== 6 && styles.verifyInlineBtnTextDisabled]}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Resend OTP Row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive code? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Resend OTP in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} disabled={resendingOtp} activeOpacity={0.7}>
                  {resendingOtp ? (
                    <ActivityIndicator size="small" color="#7A131A" />
                  ) : (
                    <Text style={styles.resendActiveText}>Resend OTP</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* New Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 chars)"
                placeholderTextColor="#999999"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setError(''); }}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#757575" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#999999"
                secureTextEntry={!showConfirmPass}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
              />
              <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Ionicons name={showConfirmPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#757575" />
              </TouchableOpacity>
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login Button */}
            <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
              <Ionicons name="arrow-back-outline" size={16} color="#7A131A" style={{ marginRight: 6 }} />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(247, 245, 240, 0.4)',
  },
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 10,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 16,
  },
  errorText: {
    color: '#D60000',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 253, 245, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#111111',
    height: '100%',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyInlineBtn: {
    backgroundColor: 'rgba(122, 19, 26, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  verifyInlineBtnDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  verifyInlineBtnText: {
    color: '#7A131A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  verifyInlineBtnTextDisabled: {
    color: '#999999',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -4,
    marginBottom: 14,
    paddingRight: 6,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#555555',
  },
  countdownText: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '600',
  },
  resendActiveText: {
    fontSize: 13,
    color: '#7A131A',
    fontWeight: '700',
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    backgroundColor: '#7A131A',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#7A131A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 10,
  },
  backToLoginText: {
    color: '#7A131A',
    fontSize: 14,
    fontWeight: '600',
  },
});
