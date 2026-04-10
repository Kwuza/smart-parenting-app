import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useApp } from '../../stores/auth';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Item({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  onPress,
  trailing,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  description?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !trailing}
    >
      <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemLabel, destructive && { color: '#EF4444' }]}>{label}</Text>
        {description && <Text style={styles.itemDesc}>{description}</Text>}
      </View>
      {trailing || (onPress && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />)}
    </TouchableOpacity>
  );
}

function ChildCard({
  name,
  age,
  color,
  onEdit,
}: {
  name: string;
  age: number | null;
  color: string;
  onEdit?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.childCard} activeOpacity={0.7} onPress={onEdit}>
      <View style={[styles.childAvatar, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.childAvatarText, { color }]}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.childInfo}>
        <Text style={styles.childName}>{name}</Text>
        <Text style={styles.childAge}>{age !== null ? `${age} years old` : 'Age not set'}</Text>
      </View>
      <Ionicons name="create-outline" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { children } = useApp();
  const router = useRouter();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const userName = user?.user_metadata?.name || 'Parent';
  const userEmail = user?.email || '';
  const initials = userName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const childColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Parent Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <TouchableOpacity style={styles.profileEditBtn} activeOpacity={0.7}>
            <Ionicons name="pencil" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Section title="Account">
          <Item
            icon="person-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Edit Profile"
            description="Update your name and photo"
          />
          <Item
            icon="mail-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Email"
            description={userEmail}
          />
          <Item
            icon="lock-closed-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Change Password"
            description="Update your account password"
          />
        </Section>

        {/* Children */}
        <Section title="Children">
          {children.map((child, i) => {
            const age = child.date_of_birth
              ? Math.floor(
                  (Date.now() - new Date(child.date_of_birth).getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000)
                )
              : null;
            return (
              <ChildCard
                key={child.id}
                name={child.name}
                age={age}
                color={childColors[i % childColors.length]}
              />
            );
          })}
          <Item
            icon="add-circle-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Add Child Profile"
            description="Monitor a new family member"
            onPress={() => router.push('/child/new')}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Item
            icon="notifications-outline"
            iconBg="#FFFBEB"
            iconColor="#F59E0B"
            label="Push Notifications"
            description="Activity reminders and alerts"
            trailing={
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor={notifEnabled ? '#3B82F6' : '#F1F5F9'}
              />
            }
          />
          <Item
            icon="document-text-outline"
            iconBg="#F5F3FF"
            iconColor="#8B5CF6"
            label="Weekly Summary"
            description="Get a report every Sunday"
            trailing={
              <Switch
                value={weeklyReport}
                onValueChange={setWeeklyReport}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor={weeklyReport ? '#3B82F6' : '#F1F5F9'}
              />
            }
          />
        </Section>

        {/* Privacy & Security */}
        <Section title="Privacy & Security">
          <Item
            icon="shield-checkmark-outline"
            iconBg="#ECFDF5"
            iconColor="#10B981"
            label="Privacy Settings"
            description="Data sharing and permissions"
          />
          <Item
            icon="finger-print-outline"
            iconBg="#ECFDF5"
            iconColor="#10B981"
            label="Biometric Login"
            description="Use Face ID or fingerprint"
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <Item
            icon="help-circle-outline"
            iconBg="#F5F3FF"
            iconColor="#8B5CF6"
            label="Help & FAQ"
            description="Common questions answered"
          />
        </Section>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>NestNote v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#0F172A' },
  scrollContent: { padding: 20 },
  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  profileEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  profileEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  // Items
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  itemDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  // Child cards
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: { fontSize: 16, fontWeight: '700' },
  childInfo: { flex: 1 },
  childName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  childAge: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 16,
  },
});
