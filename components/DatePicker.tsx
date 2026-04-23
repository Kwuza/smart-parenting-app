import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  children: React.ReactNode;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export function DatePicker({ value, onChange, maximumDate = new Date(), children }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selYear, setSelYear] = useState(value?.getFullYear() ?? currentYear - 3);
  const [selMonth, setSelMonth] = useState(value?.getMonth() ?? 0);
  const [selDay, setSelDay] = useState(value?.getDate() ?? 1);

  const daysInMonth = getDaysInMonth(selYear, selMonth);

  const handleConfirm = () => {
    const d = new Date(selYear, selMonth, selDay);
    if (d > maximumDate) return;
    onChange(d);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}>{children}</TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.title}>Select Date</Text>
            <View style={styles.pickers}>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                <Text style={styles.colLabel}>Year</Text>
                {years.map(y => (
                  <TouchableOpacity key={y} onPress={() => setSelYear(y)} style={[styles.sel, y === selYear && styles.selActive]}>
                    <Text style={[styles.selText, y === selYear && styles.selTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                <Text style={styles.colLabel}>Month</Text>
                {months.map((m, i) => (
                  <TouchableOpacity key={m} onPress={() => setSelMonth(i)} style={[styles.sel, i === selMonth && styles.selActive]}>
                    <Text style={[styles.selText, i === selMonth && styles.selTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                <Text style={styles.colLabel}>Day</Text>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                  <TouchableOpacity key={d} onPress={() => setSelDay(d)} style={[styles.sel, d === selDay && styles.selActive]}>
                    <Text style={[styles.selText, d === selDay && styles.selTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.btns}>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.btn}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.btn, styles.btnPrimary]}><Text style={[styles.btnText, styles.btnTextPrimary]}>Done</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  title: { fontSize: 17, fontWeight: '600', color: '#0F172A', textAlign: 'center', marginBottom: 16 },
  pickers: { flexDirection: 'row', height: 220 },
  col: { flex: 1 },
  colLabel: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 8 },
  sel: { paddingVertical: 8, borderRadius: 8 },
  selActive: { backgroundColor: '#FFF0ED' },
  selText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  selTextActive: { color: '#FF7F60', fontWeight: '600' },
  btns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  btnPrimary: { backgroundColor: '#FF7F60' },
  btnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  btnTextPrimary: { color: '#FFF' },
});