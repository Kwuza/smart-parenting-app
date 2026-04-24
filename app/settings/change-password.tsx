import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Inline validation errors
  const [currentPwdError, setCurrentPwdError] = useState('');
  const [newPwdError, setNewPwdError] = useState('');
  const [confirmPwdError, setConfirmPwdError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const validate = () => {
    let valid = true;
    setCurrentPwdError('');
    setNewPwdError('');
    setConfirmPwdError('');
    if (!currentPassword) {
      setCurrentPwdError('Please enter your current password');
      valid = false;
    }
    if (newPassword.length < 6) {
      setNewPwdError('New password must be at least 6 characters');
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPwdError('New passwords do not match');
      valid = false;
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitError('');
    setSubmitSuccess('');
    setSaving(true);
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSubmitSuccess('Password updated successfully!');
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const PasswordField = ({
    label,
    value,
    onChangeText,
    show,
    onToggle,
    placeholder,
    error,
    onChangeExtra,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
    error?: string;
    onChangeExtra?: () => void;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          value={value}
          onChangeText={(v) => { onChangeText(v); if (onChangeExtra) onChangeExtra(); }}
          placeholder={placeholder}
          secureTextEntry={!show}
          style={[styles.input, error && styles.inputError]}
          underlineColorAndroid="transparent"
          activeUnderlineColor="transparent"
          placeholderTextColor="#94A3B8"
          contentStyle={styles.inputContent}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#FF7F60" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {submitSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.successBannerText}>{submitSuccess}</Text>
          </View>
        ) : null}

        {/* Error Banner */}
        {submitError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorBannerText}>{submitError}</Text>
            <TouchableOpacity onPress={() => setSubmitError('')}>
              <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#6366F1" />
          <Text style={styles.infoText}>
            Your new password must be at least 6 characters. You'll stay logged in on this device.
          </Text>
        </View>

        <PasswordField
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          show={showCurrent}
          onToggle={() => setShowCurrent(!showCurrent)}
          placeholder="Enter current password"
          error={currentPwdError}
          onChangeExtra={() => setCurrentPwdError('')}
        />
        <PasswordField
          label="New Password"
          value={newPassword}
          onChangeText={(v) => { setNewPassword(v); if (newPwdError) setNewPwdError(''); if (confirmPwdError) setConfirmPwdError(''); }}
          show={showNew}
          onToggle={() => setShowNew(!showNew)}
          placeholder="Enter new password"
          error={newPwdError}
        />
        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); if (confirmPwdError) setConfirmPwdError(''); }}
          show={showConfirm}
          onToggle={() => setShowConfirm(!showConfirm)}
          placeholder="Re-enter new password"
          error={confirmPwdError}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#FFFDFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FF7F60' },
  content: { padding: 20 },
  infoCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: '#4F46E5', lineHeight: 19 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginLeft: 4 },
  input: {
    backgroundColor: '#FFFDFF', borderRadius: 14, borderWidth: 1,
    borderColor: '#E2E8F0', height: 52, flex: 1,
  },
  inputContent: { fontSize: 16, color: '#0F172A', paddingHorizontal: 4 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  eyeBtn: { position: 'absolute', right: 14, top: 14, zIndex: 1 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '500' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0',
  },
  successBannerText: { flex: 1, fontSize: 13, color: '#10B981', fontWeight: '500' },
});
