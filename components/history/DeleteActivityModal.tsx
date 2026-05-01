import { Modal, StyleSheet, TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '../../lib/api';
import { getActivityLabel } from '../../lib/activity-values';

interface DeleteActivityModalProps {
  visible: boolean;
  activity: Activity | null;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteActivityModal({
  visible,
  activity,
  loading,
  error,
  onCancel,
  onConfirm,
}: DeleteActivityModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="trash-outline" size={28} color="#EF4444" />
          </View>
          <Text style={styles.title}>Delete this activity?</Text>
          <Text style={styles.message}>This removes it from History and stats.</Text>
          {activity ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText} numberOfLines={2}>{getActivityLabel(activity.type, activity.value)}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.keepButton]}
              activeOpacity={0.75}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.keepButtonText}>Keep activity</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton, loading && styles.deleteButtonDisabled]}
              activeOpacity={0.75}
              onPress={onConfirm}
              disabled={loading || !activity}
            >
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={styles.deleteButtonText}>{loading ? 'Deleting…' : 'Delete activity'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFDFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryCard: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  summaryText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 18,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  keepButton: {
    backgroundColor: '#F1F5F9',
  },
  keepButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
