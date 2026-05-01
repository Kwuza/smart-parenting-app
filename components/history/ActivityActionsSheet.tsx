import { Modal, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '../../lib/api';
import { ACTIVITY_TYPE_CONFIG, getActivityLabel } from '../../lib/activity-values';

interface ActivityActionsSheetProps {
  visible: boolean;
  activity: Activity | null;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onClose: () => void;
  formatTime: (recordedAt: string) => string;
}

export default function ActivityActionsSheet({
  visible,
  activity,
  onEdit,
  onDelete,
  onClose,
  formatTime,
}: ActivityActionsSheetProps) {
  const config = activity ? ACTIVITY_TYPE_CONFIG.find(item => item.key === activity.type) : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {activity ? (
            <>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <View style={[styles.iconCircle, { backgroundColor: config?.bgColor ?? '#F1F5F9' }]}>
                  <Ionicons
                    name={(config?.icon ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={config?.color ?? '#64748B'}
                  />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.title} numberOfLines={2}>{getActivityLabel(activity.type, activity.value)}</Text>
                  <Text style={styles.subtitle}>{formatTime(activity.recorded_at)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.actionRow} activeOpacity={0.75} onPress={() => onEdit(activity)}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name="create-outline" size={20} color="#FF7F60" />
                </View>
                <Text style={styles.actionText}>Edit activity</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionRow} activeOpacity={0.75} onPress={() => onDelete(activity)}>
                <View style={[styles.actionIconCircle, styles.destructiveIconCircle]}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, styles.destructiveText]}>Delete activity</Text>
                <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} activeOpacity={0.75} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheet: {
    backgroundColor: '#FFFDFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveIconCircle: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  destructiveText: {
    color: '#EF4444',
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
});
