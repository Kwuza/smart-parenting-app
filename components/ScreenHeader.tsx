import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../stores/auth';
import { Child } from '../lib/api';

interface ScreenHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  backIcon?: keyof typeof Ionicons.glyphMap;
}

export default function ScreenHeader({ title, icon, subtitle, rightAction, showBack, backIcon = 'close' }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { selectedChild, children } = useApp();
  const [showPicker, setShowPicker] = useState(false);

  const handleSelect = (child: Child) => {
    useApp.getState().selectChild(child);
    setShowPicker(false);
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        {showBack ? (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name={backIcon} size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.centerTitle}>{title}</Text>
          </>
        ) : (
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              {icon && <Ionicons name={icon} size={20} color="#FF7F60" style={styles.titleIcon} />}
              <Text style={styles.title}>{title}</Text>
            </View>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}

        <View style={styles.headerRight}>
          {rightAction}
          {selectedChild && children.length > 0 && (
            <TouchableOpacity
              style={styles.childPicker}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {selectedChild.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.childName}>{selectedChild.name}</Text>
              {children.length > 1 && (
                <Ionicons name="chevron-down" size={14} color="#FF7F60" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Child Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Switch child</Text>
            {children.map((child) => {
              const isSelected = child.id === selectedChild?.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.modalItem, isSelected && styles.modalItemActive]}
                  onPress={() => handleSelect(child)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modalAvatar, isSelected && styles.modalAvatarActive]}>
                    <Text style={styles.modalAvatarText}>
                      {child.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.modalName, isSelected && styles.modalNameActive]}>
                    {child.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color="#FF7F60" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    marginRight: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  centerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginRight: 36, // balance the back button width
  },
  childPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF7F60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  modal: {
    backgroundColor: '#FFFDFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalItemActive: {
    backgroundColor: '#FFF0ED',
  },
  modalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarActive: {
    backgroundColor: '#FF7F60',
  },
  modalAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  modalNameActive: {
    fontWeight: '700',
    color: '#FF7F60',
  },
});
