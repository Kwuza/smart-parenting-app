import { View, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useApp } from '../../stores/auth';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsItem({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  onPress,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  description?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !trailing}
    >
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsLabel}>{label}</Text>
        {description && <Text style={styles.settingsDesc}>{description}</Text>}
      </View>
      {trailing || (onPress && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />)}
    </TouchableOpacity>
  );
}

function ChildCard({
  name,
  age,
  color,
  onPress,
}: {
  name: string;
  age: number | null;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.childCard} activeOpacity={0.7} onPress={onPress}>
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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const userName = user?.user_metadata?.name || 'Parent';
  const userEmail = user?.email || '';
  const initials = userName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const childColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      {/* Pull-up content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Children */}
        <SettingsSection title="Children">
          {children.map((child, i) => {
            const age = child.date_of_birth
              ? Math.floor(
                  (Date.now() - new Date(child.date_of_birth).getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000)
                )
              : null;
            return (
              <View key={child.id}>
                <ChildCard
                  name={child.name}
                  age={age}
                  color={childColors[i % childColors.length]}
                />
                {i < children.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
          <View style={styles.divider} />
          <SettingsItem
            icon="person-add-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Add Child Profile"
            description="Monitor a new family member"
            onPress={() => router.push('/child/new')}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsItem
            icon="notifications-outline"
            iconBg="#FFFBEB"
            iconColor="#F59E0B"
            label="Push Notifications"
            description="Alerts for activity milestones"
            trailing={
              <Switch
                value={true}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor="#3B82F6"
              />
            }
          />
          <SettingsItem
            icon="document-text-outline"
            iconBg="#F5F3FF"
            iconColor="#8B5CF6"
            label="Weekly Report"
            description="Summary every Sunday morning"
            trailing={
              <Switch
                value={true}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor="#3B82F6"
              />
            }
          />
          <SettingsItem
            icon="phone-portrait-outline"
            iconBg="#ECFDF5"
            iconColor="#10B981"
            label="Notification Preferences"
            description="Choose which alerts you receive"
          />
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection title="Privacy & Security">
          <SettingsItem
            icon="shield-checkmark-outline"
            iconBg="#ECFDF5"
            iconColor="#10B981"
            label="Privacy Settings"
            description="Manage data sharing & permissions"
          />
          <SettingsItem
            icon="lock-closed-outline"
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
            label="Change Password"
            description="Update your account password"
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsItem
            icon="help-circle-outline"
            iconBg="#F5F3FF"
            iconColor="#8B5CF6"
            label="Help & FAQ"
            description="Answers to common questions"
          />
          <SettingsItem
            icon="star-outline"
            iconBg="#FFFBEB"
            iconColor="#F59E0B"
            label="Rate NestNote"
            description="Share your feedback on the App Store"
          />
        </SettingsSection>

        {/* Version */}
        <Text style={styles.version}>NestNote v1.0.0</Text>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scrollContent: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  settingsDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 64,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  childAge: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  signOutButton: {
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
