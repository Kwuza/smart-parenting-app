import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../stores/auth';
import { supabase } from '../../lib/supabase';

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
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
      Alert.alert(
        'Confirmation Sent',
        'Check your new email for a confirmation link. Your email will update once confirmed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update email');
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
        <View style={styles.currentEmail}>
          <Text style={styles.currentLabel}>Current email</Text>
          <Text style={styles.currentValue}>{user?.email}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>New Email Address</Text>
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="new@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              underlineColorAndroid="transparent"
              activeUnderlineColor="transparent"
              placeholderTextColor="#94A3B8"
              contentStyle={styles.inputContent}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
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
});
