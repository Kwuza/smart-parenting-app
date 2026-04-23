import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../stores/auth';
import { supabase } from '../../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Inline validation error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    if (!newEmail.trim()) {
      setEmailError('Please enter a new email address');
      valid = false;
    } else if (!EMAIL_REGEX.test(newEmail.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }
    if (!password) {
      setPasswordError('Please enter your current password');
      valid = false;
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitError('');
    setSubmitSuccess('');
    // Verify current password by re-authenticating
    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password,
      });
      if (signInError) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setSubmitSuccess('Confirmation sent! Check your new email for a confirmation link.');
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Email</Text>
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

        <View style={styles.currentEmail}>
          <Text style={styles.currentLabel}>Current email</Text>
          <Text style={styles.currentValue}>{user?.email}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>New Email Address</Text>
            <TextInput
              value={newEmail}
              onChangeText={(v) => { setNewEmail(v); if (emailError) setEmailError(''); }}
              placeholder="new@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, emailError && styles.inputError]}
              underlineColorAndroid="transparent"
              activeUnderlineColor="transparent"
              placeholderTextColor="#94A3B8"
              contentStyle={styles.inputContent}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }, passwordError && styles.inputError]}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
            <Text style={styles.fieldHint}>Required to verify your identity</Text>
          </View>
        </View>
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
  currentEmail: {
    backgroundColor: '#FFFDFF', borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  currentLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  currentValue: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  form: { gap: 20 },
  field: {},
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginLeft: 4 },
  input: {
    backgroundColor: '#FFFDFF', borderRadius: 14, borderWidth: 1,
    borderColor: '#E2E8F0', height: 52,
  },
  inputContent: { fontSize: 16, color: '#0F172A', paddingHorizontal: 4 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 14, top: 14, zIndex: 1 },
  fieldHint: { fontSize: 12, color: '#94A3B8', marginTop: 4, marginLeft: 4 },
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
