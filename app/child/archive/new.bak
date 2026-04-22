import { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createChild } from '../../lib/api';
import { useApp, useAuth } from '../../stores/auth';

export default function NewChildScreen() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const { loadChildren } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  // Quick date helpers
  const [showQuickAges, setShowQuickAges] = useState(false);
  const quickAges = [
    { label: '1 yr', years: 1 },
    { label: '3 yrs', years: 3 },
    { label: '5 yrs', years: 5 },
    { label: '7 yrs', years: 7 },
    { label: '10 yrs', years: 10 },
  ];

  const setQuickAge = (years: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    setDob(date.toISOString().slice(0, 10));
    setShowQuickAges(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', "Please enter your child's name.");
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'Not signed in. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const newChild = await createChild(name.trim(), dob, user.id);
      await loadChildren();
      // Dismiss keyboard before navigating to avoid KeyboardAvoidingView jump
      const { Keyboard } = require('react-native');
      Keyboard.dismiss();
      router.replace(`/child/routine?childId=${newChild.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const isValidDate = !dob || /^\d{4}-\d{2}-\d{2}$/.test(dob);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Child</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Illustration + Heading */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="happy-outline" size={40} color="#FF7F60" />
          </View>
          <Text style={styles.heading}>
            Who's joining{' '}
            <Text style={styles.headingAccent}>Smart Parenting</Text>?
          </Text>
          <Text style={styles.subtitle}>
            Add your child's profile to start tracking their daily activities and get AI-powered insights.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Name Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Child's Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Emma"
                autoCapitalize="words"
                style={styles.input}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowQuickAges(!showQuickAges)}>
                <Text style={styles.quickSelect}>Quick select</Text>
              </TouchableOpacity>
            </View>

            {/* Quick age chips */}
            {showQuickAges && (
              <View style={styles.quickAgesRow}>
                {quickAges.map((qa) => (
                  <TouchableOpacity
                    key={qa.years}
                    onPress={() => setQuickAge(qa.years)}
                    style={styles.ageChip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ageChipText}>{qa.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.inputWrapper, !isValidDate && styles.inputError]}>
              <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                underlineColorAndroid="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#94A3B8"
                contentStyle={styles.inputContent}
                maxLength={10}
              />
              {dob.length > 0 && (
                <TouchableOpacity onPress={() => setDob('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
            {!isValidDate && (
              <Text style={styles.errorText}>Use format YYYY-MM-DD (e.g. 2020-01-15)</Text>
            )}
            <Text style={styles.hintText}>
              Optional — helps us provide age-appropriate recommendations.
            </Text>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading || !name.trim() || !user?.id}
          activeOpacity={0.85}
          style={[styles.createButtonWrapper, (!name.trim() || !user?.id) && styles.createButtonDisabled]}
        >
          <View style={styles.createButton}>
            <Text style={styles.createButtonText}>
              {loading ? 'Creating profile…' : 'Create Profile'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
          <Text style={styles.privacyText}>
            Your child's data is private and only visible to you.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 32,
  },
  headingAccent: {
    color: '#FF7F60',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  formCard: {
    backgroundColor: '#FFFDFF',
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickSelect: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF7F60',
  },
  quickAgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ageChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#FFE5E0',
  },
  ageChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF7F60',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFBF6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 14,
    height: 52,
    color: '#0F172A',
  },
  inputContent: {
    paddingHorizontal: 0,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  createButtonWrapper: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    shadowColor: '#FF7F60',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  createButtonDisabled: {
    shadowOpacity: 0.08,
    elevation: 1,
  },
  createButton: {
    backgroundColor: '#FF7F60',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  privacyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
