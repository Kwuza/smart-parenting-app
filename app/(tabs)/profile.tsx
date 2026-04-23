import { useState, useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, Animated, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useApp } from '../../stores/auth';
import { scheduleChildNotifications, cancelChildNotifications } from '../../lib/notifications';
import { Child } from '../../lib/api';

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
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { children, loadChildren } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [allNotificationsDisabled, setAllNotificationsDisabled] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const goodbyeOpacity = useRef(new Animated.Value(0)).current;
  const goodbyeScale = useRef(new Animated.Value(0.8)).current;

  const childColors = ['#FF7F60', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const userName = user?.user_metadata?.name || 'Parent';
  const userEmail = user?.email || '';
  const initials = userName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadChildren();
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load children');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadChildren();
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load children');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle global "All Notifications" toggle
  useEffect(() => {
    if (!children.length) return;
    const apply = async () => {
      try {
        if (allNotificationsDisabled) {
          await Promise.all(children.map(c => cancelChildNotifications(c.id)));
        } else {
          await Promise.all(children.map(c => scheduleChildNotifications(c as Child)));
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to update notifications');
      }
    };
    apply();
  }, [allNotificationsDisabled]);

  const openChildSettings = (child: Child) => {
    router.push(`/settings/child/${child.id}`);
  };

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    setShowGoodbye(true);

    Animated.parallel([
      Animated.timing(goodbyeOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(goodbyeScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(goodbyeOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(async () => {
          await signOut();
          goodbyeScale.setValue(0.8);
          setShowGoodbye(false);
          router.replace('/(auth)/login');
        });
      }, 1200);
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#FF7F60" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7F60"
          />
        }
      >
        {/* Parent Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <TouchableOpacity style={styles.profileEditBtn} activeOpacity={0.7} onPress={() => router.push('/settings/edit-profile')}>
            <Ionicons name="pencil" size={16} color="#FF7F60" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Section title="Account">
          <Item
            icon="person-outline"
            iconBg="#FFF0ED"
            iconColor="#FF7F60"
            label="Edit Profile"
            description="Update your name and photo"
            onPress={() => router.push('/settings/edit-profile')}
          />
          <Item
            icon="mail-outline"
            iconBg="#FFF0ED"
            iconColor="#FF7F60"
            label="Email"
            description={userEmail}
            onPress={() => router.push('/settings/change-email')}
          />
          <Item
            icon="lock-closed-outline"
            iconBg="#FFF0ED"
            iconColor="#FF7F60"
            label="Change Password"
            description="Update your account password"
            onPress={() => router.push('/settings/change-password')}
          />
        </Section>

        {/* Children */}
        <Section title="Children">
          {children.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateInner}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="add-circle-outline" size={48} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No children yet</Text>
                <Text style={styles.emptySubtitle}>Add your first child profile to start tracking</Text>
                <TouchableOpacity
                  style={styles.emptyCtaBtn}
                  onPress={() => router.push('/child/wizard' as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyCtaText}>Add Child</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
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
                    onEdit={() => openChildSettings(child)}
                  />
                );
              })}
              <Item
                icon="add-circle-outline"
                iconBg="#FFF0ED"
                iconColor="#FF7F60"
                label="Add Child Profile"
                description="Monitor a new family member"
                onPress={() => router.push('/child/wizard' as any)}
              />
            </>
          )}
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Item
            icon="notifications-off-outline"
            iconBg="#FFFBEB"
            iconColor="#F59E0B"
            label="All Notifications"
            description="Turn off all child activity alerts"
            trailing={
              <Switch
                value={allNotificationsDisabled}
                onValueChange={setAllNotificationsDisabled}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor={allNotificationsDisabled ? '#FF7F60' : '#F1F5F9'}
              />
            }
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
            onPress={() => router.push('/settings/help')}
          />
        </Section>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => setShowSignOutConfirm(true)} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Smart Parenting v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSignOutConfirm(false)}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmText}>Are you sure you want to sign out of your account?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowSignOutConfirm(false)} activeOpacity={0.7}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmSignOut} onPress={handleSignOut} activeOpacity={0.7}>
                <Text style={styles.confirmSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Goodbye Animation Overlay */}
      {showGoodbye && (
        <Animated.View style={[styles.goodbyeOverlay, { opacity: goodbyeOpacity }]}>
          <Animated.View style={[styles.goodbyeContent, { transform: [{ scale: goodbyeScale }] }]}>
            <Ionicons name="heart" size={48} color="#FF7F60" style={{ marginBottom: 16 }} />
            <Text style={styles.goodbyeTitle}>See you soon!</Text>
            <Text style={styles.goodbyeSubtitle}>Take care of your little ones 💙</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFDFF',
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
    backgroundColor: '#FFFDFF',
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
    backgroundColor: '#FF7F60',
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
    backgroundColor: '#FFF0ED',
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
    backgroundColor: '#FFFDFF',
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
    backgroundColor: '#FFFDFF',
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
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmModal: {
    backgroundColor: '#FFFDFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  confirmSignOut: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmSignOutText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  // Goodbye overlay
  goodbyeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goodbyeContent: {
    alignItems: 'center',
    padding: 40,
  },
  goodbyeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  goodbyeSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  // Loading state
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEFBF6',
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  // Empty state
  emptyStateCard: {
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginTop: 8,
  },
  emptyStateInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF7F60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
