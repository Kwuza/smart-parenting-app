import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import { pickAndUploadImage } from '../../lib/image';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const currentName = user?.user_metadata?.name || '';
  const currentAvatar = user?.user_metadata?.avatar_url || '';

  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadImage({ userId: user?.id || '' });
      console.log('[EditProfile] Upload result:', result);
      if (result) {
        setAvatarUrl(result.url);
      }
    } catch (e: any) {
      console.error('[EditProfile] Upload error:', e);
      Alert.alert('Upload failed', e?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      console.log('[EditProfile] Saving avatar_url:', avatarUrl);
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim(), avatar_url: avatarUrl },
      });
      if (error) throw error;
      Alert.alert('Success', 'Profile updated', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#FF7F60" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.avatarSection} onPress={pickImage} activeOpacity={0.7}>
          {uploading ? (
            <View style={styles.avatar}>
              <ActivityIndicator size="large" color="#FF7F60" />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              style={styles.input}
              underlineColorAndroid="transparent"
              activeUnderlineColor="transparent"
              placeholderTextColor="#94A3B8"
              contentStyle={styles.inputContent}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={user?.email || ''}
              editable={false}
              style={[styles.input, styles.inputDisabled]}
              underlineColorAndroid="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
            <Text style={styles.fieldHint}>Change email from the Email section in Settings</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFDFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FF7F60' },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32, position: 'relative' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF7F60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  cameraIcon: {
    position: 'absolute',
    bottom: 24,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF7F60',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FEFBF6',
  },
  avatarHint: { fontSize: 13, color: '#64748B', marginTop: 8 },
  form: { gap: 20 },
  field: {},
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginLeft: 4 },
  input: {
    backgroundColor: '#FFFDFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 52,
  },
  inputDisabled: { backgroundColor: '#F8FAFC' },
  inputContent: { fontSize: 16, color: '#0F172A', paddingHorizontal: 4 },
  fieldHint: { fontSize: 12, color: '#94A3B8', marginTop: 4, marginLeft: 4 },
});
