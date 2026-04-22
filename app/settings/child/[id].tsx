import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TextInput as RNTextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Switch } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../stores/auth';
import { updateChildSettings, updateChildRoutine, Child, RoutineData, getAgeGroup } from '../../../lib/api';
import { pickAndUploadImage } from '../../../lib/image';
import { scheduleChildNotifications } from '../../../lib/notifications';

// Top 3 most used max screen time presets
const SCREEN_PRESETS = [
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
];

// Quick time presets
const QUICK_TIMES: Record<string, { h: string; m: string; p: 'AM' | 'PM' }[]> = {
  bedtime: [{ h: '7', m: '30', p: 'PM' }, { h: '8', m: '00', p: 'PM' }, { h: '8', m: '30', p: 'PM' }, { h: '9', m: '00', p: 'PM' }],
  wake: [{ h: '6', m: '00', p: 'AM' }, { h: '6', m: '30', p: 'AM' }, { h: '7', m: '00', p: 'AM' }, { h: '7', m: '30', p: 'AM' }],
  breakfast: [{ h: '7', m: '00', p: 'AM' }, { h: '7', m: '30', p: 'AM' }, { h: '8', m: '00', p: 'AM' }],
  lunch: [{ h: '12', m: '00', p: 'PM' }, { h: '12', m: '30', p: 'PM' }],
  snack: [{ h: '2', m: '00', p: 'PM' }, { h: '3', m: '00', p: 'PM' }],
  dinner: [{ h: '5', m: '30', p: 'PM' }, { h: '6', m: '00', p: 'PM' }],
  nap: [{ h: '12', m: '00', p: 'PM' }, { h: '1', m: '00', p: 'PM' }],
  activity: [{ h: '9', m: '00', p: 'AM' }, { h: '10', m: '00', p: 'AM' }, { h: '3', m: '00', p: 'PM' }],
  learn: [{ h: '9', m: '00', p: 'AM' }, { h: '2', m: '00', p: 'PM' }],
};

function toTimeStr(h: string, m: string, p: 'AM' | 'PM'): string {
  let hour = parseInt(h) || 0;
  if (p === 'PM' && hour !== 12) hour += 12;
  if (p === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

function fromTimeStr(timeStr: string | null): { h: string; m: string; p: 'AM' | 'PM' } {
  if (!timeStr) return { h: '', m: '', p: 'AM' };
  const parts = timeStr.split(':');
  let hour = parseInt(parts[0]) || 0;
  const minute = parts[1] || '00';
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return { h: hour.toString(), m: minute, p: period };
}

// Per-child notification types
const CHILD_NOTIFICATIONS = [
  { key: 'bedtime', label: 'Bedtime Reminder', icon: 'moon-outline' as const, color: '#8B5CF6', defaultOn: true },
  { key: 'wake_up', label: 'Wake-Up Reminder', icon: 'sunny-outline' as const, color: '#F59E0B', defaultOn: true },
  { key: 'breakfast', label: 'Breakfast Reminder', icon: 'egg-outline' as const, color: '#FF7F60', defaultOn: true },
  { key: 'lunch', label: 'Lunch Reminder', icon: 'restaurant-outline' as const, color: '#10B981', defaultOn: true },
  { key: 'snack', label: 'Snack Reminder', icon: 'nutrition-outline' as const, color: '#F59E0B', defaultOn: true },
  { key: 'dinner', label: 'Dinner Reminder', icon: 'fast-food-outline' as const, color: '#EF4444', defaultOn: true },
  { key: 'nap', label: 'Nap Reminder', icon: 'bed-outline' as const, color: '#8B5CF6', defaultOn: true },
  { key: 'activity', label: 'Activity Reminder', icon: 'fitness-outline' as const, color: '#EF4444', defaultOn: true },
  { key: 'learn', label: 'Learning Reminder', icon: 'school-outline' as const, color: '#6366F1', defaultOn: true },
  { key: 'screen_limit', label: 'Screen Time Limit', icon: 'phone-portrait-outline' as const, color: '#FF7F60', defaultOn: true },
  { key: 'sleep_minimum', label: 'Sleep Minimum Alert', icon: 'moon-outline' as const, color: '#10B981', defaultOn: true },
  { key: 'measurements', label: 'Weekly Measurements', icon: 'resize-outline' as const, color: '#6366F1', defaultOn: true },
];

export default function ChildSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { children, loadChildren } = useApp();
  const child = children.find((c: Child) => c.id === params.id);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Max screen time
  const [screenH, setScreenH] = useState('');
  const [screenM, setScreenM] = useState('');
  const [screenDisabled, setScreenDisabled] = useState(false);

  // Min sleep
  const [sleepH, setSleepH] = useState('');
  const [sleepM, setSleepM] = useState('');
  const [sleepDisabled, setSleepDisabled] = useState(false);

  // Child avatar
  const [avatarUrl, setAvatarUrl] = useState('');

  // Routines
  const [bedH, setBedH] = useState('');
  const [bedM, setBedM] = useState('');
  const [bedP, setBedP] = useState<'AM' | 'PM'>('PM');
  const [wakeH, setWakeH] = useState('');
  const [wakeM, setWakeM] = useState('');
  const [wakeP, setWakeP] = useState<'AM' | 'PM'>('AM');
  const [bfH, setBfH] = useState('');
  const [bfM, setBfM] = useState('');
  const [bfP, setBfP] = useState<'AM' | 'PM'>('AM');
  const [luH, setLuH] = useState('');
  const [luM, setLuM] = useState('');
  const [luP, setLuP] = useState<'AM' | 'PM'>('PM');
  const [snH, setSnH] = useState('');
  const [snM, setSnM] = useState('');
  const [snP, setSnP] = useState<'AM' | 'PM'>('PM');
  const [diH, setDiH] = useState('');
  const [diM, setDiM] = useState('');
  const [diP, setDiP] = useState<'AM' | 'PM'>('PM');
  const [napH, setNapH] = useState('');
  const [napM, setNapM] = useState('');
  const [napP, setNapP] = useState<'AM' | 'PM'>('PM');
  const [actH, setActH] = useState('');
  const [actM, setActM] = useState('');
  const [actP, setActP] = useState<'AM' | 'PM'>('AM');
  const [lrnH, setLrnH] = useState('');
  const [lrnM, setLrnM] = useState('');
  const [lrnP, setLrnP] = useState<'AM' | 'PM'>('AM');

  // Per-child notification toggles
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!child) return;
    setName(child.name);
    setAvatarUrl(child.avatar_url || '');

    // Load screen time
    if (child.max_screen_time_minutes != null) {
      setScreenH(String(Math.floor(child.max_screen_time_minutes / 60)));
      setScreenM(String(child.max_screen_time_minutes % 60));
      setScreenDisabled(false);
    } else {
      setScreenH(''); setScreenM(''); setScreenDisabled(true);
    }

    // Load sleep minimum
    if (child.min_sleep_minutes != null) {
      setSleepH(String(Math.floor(child.min_sleep_minutes / 60)));
      setSleepM(String(child.min_sleep_minutes % 60));
      setSleepDisabled(false);
    } else {
      setSleepH(''); setSleepM(''); setSleepDisabled(true);
    }

    // Load routines
    const bed = fromTimeStr(child.bedtime);
    setBedH(bed.h); setBedM(bed.m); setBedP(bed.p);
    const wake = fromTimeStr(child.wake_up_time);
    setWakeH(wake.h); setWakeM(wake.m); setWakeP(wake.p);
    const bf = fromTimeStr(child.breakfast_time);
    setBfH(bf.h); setBfM(bf.m); setBfP(bf.p);
    const lu = fromTimeStr(child.lunch_time);
    setLuH(lu.h); setLuM(lu.m); setLuP(lu.p);
    const sn = fromTimeStr(child.snack_time);
    setSnH(sn.h); setSnM(sn.m); setSnP(sn.p);
    const di = fromTimeStr(child.dinner_time);
    setDiH(di.h); setDiM(di.m); setDiP(di.p);
    const nap = fromTimeStr(child.nap_time);
    setNapH(nap.h); setNapM(nap.m); setNapP(nap.p);
    const act = fromTimeStr(child.activity_time);
    setActH(act.h); setActM(act.m); setActP(act.p);
    const lrn = fromTimeStr(child.learn_time);
    setLrnH(lrn.h); setLrnM(lrn.m); setLrnP(lrn.p);

    // Load notification toggles (default all on)
    const initial: Record<string, boolean> = {};
    CHILD_NOTIFICATIONS.forEach(n => { initial[n.key] = n.defaultOn; });
    setNotifToggles(initial);
  }, [child]);

  if (!child) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7F60" />
      </View>
    );
  }

  const ageGroup = getAgeGroup(child.date_of_birth);

  const pickImage = async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadImage({ userId: child.id, folder: 'child-avatars' });
      if (result) setAvatarUrl(result.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const applyPreset = (minutes: number) => {
    setScreenH(String(Math.floor(minutes / 60)));
    setScreenM(String(minutes % 60));
    setScreenDisabled(false);
  };

  const toggleNotif = (key: string) => {
    setNotifToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings
      const maxScreen = screenDisabled ? null : ((parseInt(screenH) || 0) * 60 + (parseInt(screenM) || 0)) || null;
      const minSleep = sleepDisabled ? null : ((parseInt(sleepH) || 0) * 60 + (parseInt(sleepM) || 0)) || null;

      await updateChildSettings(child.id, {
        max_screen_time_minutes: maxScreen,
        min_sleep_minutes: minSleep,
        avatar_url: avatarUrl || null,
      } as any);

      // Save routines
      const routine: RoutineData = {
        bedtime: bedH && bedM ? toTimeStr(bedH, bedM, bedP) : null,
        wake_up_time: wakeH && wakeM ? toTimeStr(wakeH, wakeM, wakeP) : null,
        breakfast_time: bfH && bfM ? toTimeStr(bfH, bfM, bfP) : null,
        lunch_time: luH && luM ? toTimeStr(luH, luM, luP) : null,
        snack_time: snH && snM ? toTimeStr(snH, snM, snP) : null,
        dinner_time: diH && diM ? toTimeStr(diH, diM, diP) : null,
        nap_time: napH && napM ? toTimeStr(napH, napM, napP) : null,
        activity_time: actH && actM ? toTimeStr(actH, actM, actP) : null,
        learn_time: lrnH && lrnM ? toTimeStr(lrnH, lrnM, lrnP) : null,
        height_cm: child.height_cm,
        weight_kg: child.weight_kg,
        gender: child.gender,
        bmi: child.bmi,
      };
      await updateChildRoutine(child.id, routine);

      // Schedule notifications
      const updatedChild = { ...child, ...routine, max_screen_time_minutes: maxScreen, min_sleep_minutes: minSleep };
      await scheduleChildNotifications(updatedChild as Child);

      await loadChildren();
      Alert.alert('Saved', `${child.name}'s settings updated`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const childInitials = name.charAt(0).toUpperCase();

  // Time Field Component
  const TimeField = ({ label, icon, quickKey, h, m, p, setH, setM, setP }: {
    label: string; icon: keyof typeof Ionicons.glyphMap; quickKey: string;
    h: string; m: string; p: 'AM' | 'PM';
    setH: (v: string) => void; setM: (v: string) => void; setP: (v: 'AM' | 'PM') => void;
  }) => {
    const times = QUICK_TIMES[quickKey] || [];
    return (
      <View style={styles.timeField}>
        <View style={styles.timeFieldHeader}>
          <Ionicons name={icon} size={14} color="#64748B" />
          <Text style={styles.timeFieldLabel}>{label}</Text>
        </View>
        {times.length > 0 && (
          <View style={styles.quickRow}>
            {times.map((t, i) => (
              <TouchableOpacity key={i} style={styles.quickChip} activeOpacity={0.7}
                onPress={() => { setH(t.h); setM(t.m); setP(t.p); }}>
                <Text style={styles.quickChipText}>{t.h}:{t.m} {t.p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.timeRow}>
          <View style={styles.timeInputBox}>
            <RNTextInput value={h} onChangeText={(v) => setH(v.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="12"
              keyboardType="number-pad" maxLength={2}
              style={styles.timeInputRN} placeholderTextColor="#CBD5E1"
              textAlign="center" textAlignVertical="center" />
          </View>
          <Text style={styles.timeColon}>:</Text>
          <View style={styles.timeInputBox}>
            <RNTextInput value={m} onChangeText={(v) => setM(v.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="00"
              keyboardType="number-pad" maxLength={2}
              style={styles.timeInputRN} placeholderTextColor="#CBD5E1"
              textAlign="center" textAlignVertical="center" />
          </View>
          <View style={styles.ampmRow}>
            {(['AM', 'PM'] as const).map((ap) => (
              <TouchableOpacity key={ap} style={[styles.ampmBtn, p === ap && styles.ampmBtnActive]}
                onPress={() => setP(ap)}>
                <Text style={[styles.ampmText, p === ap && styles.ampmTextActive]}>{ap}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Duration Input Component
  const DurationInput = ({ label, hours, minutes, disabled, onHoursChange, onMinutesChange, onDisabledChange, presets }: {
    label: string; hours: string; minutes: string; disabled: boolean;
    onHoursChange: (v: string) => void; onMinutesChange: (v: string) => void;
    onDisabledChange: (v: boolean) => void; presets?: typeof SCREEN_PRESETS;
  }) => (
    <View>
      <View style={styles.durationHeader}>
        <Text style={styles.durationLabel}>{label}</Text>
        <TouchableOpacity onPress={() => onDisabledChange(!disabled)} activeOpacity={0.7}>
          <Text style={[styles.toggleText, disabled && styles.toggleTextOff]}>
            {disabled ? 'Disabled' : 'Enabled'}
          </Text>
        </TouchableOpacity>
      </View>
      {!disabled && (
        <>
          {presets && (
            <View style={styles.presetRow}>
              {presets.map((p) => (
                <TouchableOpacity key={p.label} style={[
                  styles.presetChip,
                  `${hours}:${minutes}` === `${Math.floor(p.minutes / 60)}:${p.minutes % 60}` && styles.presetChipActive,
                ]} onPress={() => applyPreset(p.minutes)} activeOpacity={0.7}>
                  <Text style={[
                    styles.presetText,
                    `${hours}:${minutes}` === `${Math.floor(p.minutes / 60)}:${p.minutes % 60}` && styles.presetTextActive,
                  ]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.durationRow}>
            <View style={styles.durationCol}>
              <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6}
                onPress={() => onHoursChange(String(Math.min(23, (parseInt(hours) || 0) + 1)))}>
                <Ionicons name="add" size={18} color="#FF7F60" />
              </TouchableOpacity>
              <TextInput value={hours}
                onChangeText={(t) => onHoursChange(String(Math.min(23, parseInt(t.replace(/[^0-9]/g, '')) || 0)))}
                keyboardType="numeric" style={styles.durationInput} maxLength={2}
                underlineColorAndroid="transparent" activeUnderlineColor="transparent"
                placeholder="0" placeholderTextColor="#CBD5E1" contentStyle={styles.durationInputContent} />
              <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6}
                onPress={() => onHoursChange(String(Math.max(0, (parseInt(hours) || 0) - 1)))}>
                <Ionicons name="remove" size={18} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.durationUnit}>hrs</Text>
            </View>
            <Text style={styles.durationColon}>:</Text>
            <View style={styles.durationCol}>
              <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6}
                onPress={() => onMinutesChange(String(Math.min(59, (parseInt(minutes) || 0) + 5)))}>
                <Ionicons name="add" size={18} color="#FF7F60" />
              </TouchableOpacity>
              <TextInput value={minutes}
                onChangeText={(t) => onMinutesChange(String(Math.min(59, parseInt(t.replace(/[^0-9]/g, '')) || 0)))}
                keyboardType="numeric" style={styles.durationInput} maxLength={2}
                underlineColorAndroid="transparent" activeUnderlineColor="transparent"
                placeholder="0" placeholderTextColor="#CBD5E1" contentStyle={styles.durationInputContent} />
              <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6}
                onPress={() => onMinutesChange(String(Math.max(0, (parseInt(minutes) || 0) - 5)))}>
                <Ionicons name="remove" size={18} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.durationUnit}>min</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{child.name}'s Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#FF7F60" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Child Photo */}
        <TouchableOpacity style={styles.avatarSection} onPress={pickImage} activeOpacity={0.7}>
          {uploading ? (
            <View style={styles.avatar}><ActivityIndicator size="large" color="#FF7F60" /></View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#FFF0ED' }]}>
              <Text style={styles.avatarText}>{childInitials}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}><Ionicons name="camera" size={16} color="#FFFFFF" /></View>
          <Text style={styles.avatarHint}>Change photo</Text>
        </TouchableOpacity>

        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.nameInput}
            underlineColorAndroid="transparent" activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8" contentStyle={styles.nameInputContent} />
        </View>

        {/* Max Screen Time */}
        <View style={styles.card}>
          <DurationInput label="Max Daily Screen Time" hours={screenH} minutes={screenM}
            disabled={screenDisabled} onHoursChange={setScreenH} onMinutesChange={setScreenM}
            onDisabledChange={setScreenDisabled} presets={SCREEN_PRESETS} />
        </View>

        {/* Min Sleep Time */}
        <View style={styles.card}>
          <DurationInput label="Minimum Sleep Time" hours={sleepH} minutes={sleepM}
            disabled={sleepDisabled} onHoursChange={setSleepH} onMinutesChange={setSleepM}
            onDisabledChange={setSleepDisabled} />
        </View>

        {/* Sleep Schedule */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="moon-outline" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Sleep Schedule</Text>
          </View>
          <TimeField label="Bedtime" icon="moon-outline" quickKey="bedtime"
            h={bedH} m={bedM} p={bedP} setH={setBedH} setM={setBedM} setP={setBedP} />
          <TimeField label="Wake-up Time" icon="sunny-outline" quickKey="wake"
            h={wakeH} m={wakeM} p={wakeP} setH={setWakeH} setM={setWakeM} setP={setWakeP} />
        </View>

        {/* Meals */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="restaurant-outline" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Meal Times</Text>
          </View>
          <TimeField label="Breakfast" icon="egg-outline" quickKey="breakfast"
            h={bfH} m={bfM} p={bfP} setH={setBfH} setM={setBfM} setP={setBfP} />
          <TimeField label="Lunch" icon="restaurant-outline" quickKey="lunch"
            h={luH} m={luM} p={luP} setH={setLuH} setM={setLuM} setP={setLuP} />
          <TimeField label="Snack" icon="nutrition-outline" quickKey="snack"
            h={snH} m={snM} p={snP} setH={setSnH} setM={setSnM} setP={setSnP} />
          <TimeField label="Dinner" icon="fast-food-outline" quickKey="dinner"
            h={diH} m={diM} p={diP} setH={setDiH} setM={setDiM} setP={setDiP} />
        </View>

        {/* Activities */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="fitness-outline" size={18} color="#EF4444" />
            <Text style={styles.sectionTitle}>Activities</Text>
          </View>
          <TimeField label="Nap Time" icon="bed-outline" quickKey="nap"
            h={napH} m={napM} p={napP} setH={setNapH} setM={setNapM} setP={setNapP} />
          <TimeField label="Activity Time" icon="fitness-outline" quickKey="activity"
            h={actH} m={actM} p={actP} setH={setActH} setM={setActM} setP={setActP} />
          <TimeField label="Learning Time" icon="book-outline" quickKey="learn"
            h={lrnH} m={lrnM} p={lrnP} setH={setLrnH} setM={setLrnM} setP={setLrnP} />
        </View>

        {/* Notifications — per child */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications-outline" size={18} color="#6366F1" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <Text style={styles.notifDesc}>Choose which reminders {child.name} receives</Text>
          {CHILD_NOTIFICATIONS.map((notif) => (
            <View key={notif.key} style={styles.notifItem}>
              <View style={[styles.notifIcon, { backgroundColor: `${notif.color}15` }]}>
                <Ionicons name={notif.icon} size={16} color={notif.color} />
              </View>
              <Text style={styles.notifLabel}>{notif.label}</Text>
              <Switch
                value={notifToggles[notif.key] ?? true}
                onValueChange={() => toggleNotif(notif.key)}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor={notifToggles[notif.key] ? '#FF7F60' : '#F1F5F9'}
              />
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFBF6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFDFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FF7F60' },
  scrollContent: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20, position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FF7F60', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FF7F60' },
  cameraIcon: { position: 'absolute', bottom: 20, right: '35%', width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF7F60', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FEFBF6' },
  avatarHint: { fontSize: 12, color: '#64748B', marginTop: 8 },
  card: { backgroundColor: '#FFFDFF', borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  nameInput: { backgroundColor: '#FEFBF6', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', height: 48 },
  nameInputContent: { fontSize: 16, color: '#0F172A', paddingHorizontal: 4 },
  durationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  durationLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  toggleTextOff: { color: '#EF4444' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  presetChipActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  presetText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  presetTextActive: { color: '#FF7F60' },
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  durationCol: { alignItems: 'center', gap: 4 },
  stepperBtn: { width: 44, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  durationInput: { backgroundColor: '#FFFDFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', width: 72, height: 52, textAlign: 'center' },
  durationInputContent: { fontSize: 28, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  durationColon: { fontSize: 24, fontWeight: '300', color: '#CBD5E1', marginBottom: 28 },
  durationUnit: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  timeField: { marginBottom: 16 },
  timeFieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  timeFieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  quickChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: '#F1F5F9' },
  quickChipText: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInputBox: { width: 48, height: 44, backgroundColor: '#FEFBF6', borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  timeInputRN: { width: '100%', height: '100%', fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', textAlignVertical: 'center', padding: 0, margin: 0, includeFontPadding: false },
  timeColon: { fontSize: 18, fontWeight: '300', color: '#CBD5E1' },
  ampmRow: { flexDirection: 'row', gap: 4, marginLeft: 4 },
  ampmBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  ampmBtnActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  ampmText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  ampmTextActive: { color: '#FF7F60' },
  notifDesc: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' },
  notifIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0F172A' },
});
