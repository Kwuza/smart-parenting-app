import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
  TextInput as RNTextInput, Switch, Modal, Text,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { pickAndUploadImage } from '../../../lib/image';
import { scheduleChildNotifications } from '../../../lib/notifications';
import { assessBmi, BmiResult } from '../../../lib/bmi';
import {
  updateChildSettings, updateChildRoutine, Child, RoutineData,
  getAgeGroup, getAgeMonths,
} from '../../../lib/api';
import { useApp } from '../../../stores/auth';
import { DatePicker } from '../../../components/DatePicker';

// ── Avatar Icons ───────────────────────────────────────────────────────────────
const AVATAR_ICONS = ['👶', '🧒', '👧', '👦', '🦁', '🐰', '🐻', '⭐'] as const;
type AvatarIcon = (typeof AVATAR_ICONS)[number];

// ── Quick time pickers ─────────────────────────────────────────────────────────
const QUICK_TIMES: Record<string, { h: string; m: string; p: 'AM' | 'PM' }[]> = {
  bedtime:   [{ h: '7', m: '30', p: 'PM' }, { h: '8', m: '00', p: 'PM' }, { h: '8', m: '30', p: 'PM' }, { h: '9', m: '00', p: 'PM' }],
  wake:      [{ h: '6', m: '00', p: 'AM' }, { h: '6', m: '30', p: 'AM' }, { h: '7', m: '00', p: 'AM' }, { h: '7', m: '30', p: 'AM' }],
  breakfast: [{ h: '7', m: '00', p: 'AM' }, { h: '7', m: '30', p: 'AM' }, { h: '8', m: '00', p: 'AM' }],
  lunch:     [{ h: '12', m: '00', p: 'PM' }, { h: '12', m: '30', p: 'PM' }],
  snack:     [{ h: '2', m: '00', p: 'PM' }, { h: '3', m: '00', p: 'PM' }],
  dinner:    [{ h: '5', m: '30', p: 'PM' }, { h: '6', m: '00', p: 'PM' }],
  nap:       [{ h: '12', m: '00', p: 'PM' }, { h: '1', m: '00', p: 'PM' }],
  activity:  [{ h: '9', m: '00', p: 'AM' }, { h: '10', m: '00', p: 'AM' }, { h: '3', m: '00', p: 'PM' }],
  learn:     [{ h: '9', m: '00', p: 'AM' }, { h: '2', m: '00', p: 'PM' }],
};

// ── Notification types ────────────────────────────────────────────────────────
const CHILD_NOTIFICATIONS = [
  { key: 'bedtime',      label: 'Bedtime Reminder',       icon: 'moon-outline'         as const, color: '#8B5CF6' },
  { key: 'wake_up',      label: 'Wake-Up Reminder',       icon: 'sunny-outline'        as const, color: '#F59E0B' },
  { key: 'breakfast',    label: 'Breakfast Reminder',     icon: 'egg-outline'          as const, color: '#FF7F60' },
  { key: 'lunch',        label: 'Lunch Reminder',         icon: 'restaurant-outline'   as const, color: '#10B981' },
  { key: 'snack',        label: 'Snack Reminder',          icon: 'nutrition-outline'    as const, color: '#F59E0B' },
  { key: 'dinner',       label: 'Dinner Reminder',        icon: 'fast-food-outline'   as const, color: '#EF4444' },
  { key: 'nap',          label: 'Nap Reminder',           icon: 'bed-outline'          as const, color: '#8B5CF6' },
  { key: 'activity',     label: 'Activity Reminder',      icon: 'fitness-outline'     as const, color: '#EF4444' },
  { key: 'learn',        label: 'Learning Reminder',       icon: 'school-outline'      as const, color: '#6366F1' },
  { key: 'weekly_growth',label: 'Weekly Growth Check',    icon: 'stats-chart-outline'  as const, color: '#10B981' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function formatDob(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChildSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { children, loadChildren } = useApp();
  const child = children.find((c: Child) => c.id === params.id);

  // Loading state — wait for children data before rendering
  const [loadingData, setLoadingData] = useState(true);

  // Reload children from DB whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoadingData(true);
      loadChildren().finally(() => setLoadingData(false));
    }, [loadChildren])
  );

  // Show spinner while waiting for child data
  if (loadingData || !child) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFBF6' }}>
        <ActivityIndicator size="large" color="#FF7F60" />
      </View>
    );
  }

  // ── Profile state ───────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<AvatarIcon>('👶');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Body state ─────────────────────────────────────────────────────────────
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmiResult, setBmiResult] = useState<BmiResult | null>(null);

  // ── Routines ───────────────────────────────────────────────────────────────
  const [bedH, setBedH] = useState(''); const [bedM, setBedM] = useState(''); const [bedP, setBedP] = useState<'AM' | 'PM'>('PM');
  const [wakeH, setWakeH] = useState(''); const [wakeM, setWakeM] = useState(''); const [wakeP, setWakeP] = useState<'AM' | 'PM'>('AM');
  const [bfH, setBfH] = useState(''); const [bfM, setBfM] = useState(''); const [bfP, setBfP] = useState<'AM' | 'PM'>('AM');
  const [luH, setLuH] = useState(''); const [luM, setLuM] = useState(''); const [luP, setLuP] = useState<'AM' | 'PM'>('PM');
  const [snH, setSnH] = useState(''); const [snM, setSnM] = useState(''); const [snP, setSnP] = useState<'AM' | 'PM'>('PM');
  const [diH, setDiH] = useState(''); const [diM, setDiM] = useState(''); const [diP, setDiP] = useState<'AM' | 'PM'>('PM');
  const [napH, setNapH] = useState(''); const [napM, setNapM] = useState(''); const [napP, setNapP] = useState<'AM' | 'PM'>('PM');
  const [actH, setActH] = useState(''); const [actM, setActM] = useState(''); const [actP, setActP] = useState<'AM' | 'PM'>('AM');
  const [lrnH, setLrnH] = useState(''); const [lrnM, setLrnM] = useState(''); const [lrnP, setLrnP] = useState<'AM' | 'PM'>('AM');

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(CHILD_NOTIFICATIONS.map(n => [n.key, true]))
  );

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // ── Load child data into form ──────────────────────────────────────────────
  useEffect(() => {
    if (!child) return;
    setName(child.name);
    setAvatarUrl(child.avatar_url || '');
    setDob(child.date_of_birth ? new Date(child.date_of_birth + 'T00:00:00') : null);
    setGender(child.gender);
    setHeight(child.height_cm != null ? String(child.height_cm) : '');
    setWeight(child.weight_kg != null ? String(child.weight_kg) : '');

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

    // Load notification toggles from DB (defaults to all true)
    const dbNotifs = child.notifications as Record<string, boolean> | null;
    const initial = Object.fromEntries(CHILD_NOTIFICATIONS.map(n => [n.key, dbNotifs?.[n.key] ?? true]));
    setNotifToggles(initial);
  }, [child]);

  // Live BMI preview
  const ageMonths = dob ? getAgeMonths(dob.toISOString().slice(0, 10)) : 0;
  useEffect(() => {
    if (!height || !weight || !gender || ageMonths < 24 || ageMonths > 60) {
      setBmiResult(null);
      return;
    }
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      setBmiResult(null);
      return;
    }
    setBmiResult(assessBmi(h, w, ageMonths, gender));
  }, [height, weight, gender, ageMonths]);

  // ── Computed ────────────────────────────────────────────────────────────────
  const ageGroup = child ? getAgeGroup(child.date_of_birth) : 'toddler';

  // ── Handlers ───────────────────────────────────────────────────────────────
  const pickImage = async () => {
    setUploadError('');
    setUploading(true);
    try {
      const result = await pickAndUploadImage({ userId: child!.id, folder: 'child-avatars' });
      if (result) setAvatarUrl(result.url);
    } catch (e: any) {
      setUploadError(e?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const toggleNotif = (key: string) => {
    setNotifToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!child) return;
    setSubmitError('');
    setSubmitSuccess('');
    setSaving(true);
    try {
      // Save basic info + notification toggles
      await updateChildSettings(child.id, {
        name: name.trim(),
        date_of_birth: dob ? dob.toISOString().slice(0, 10) : undefined,
        avatar_url: avatarUrl || null,
        notifications: notifToggles,
      });

      // Compute BMI
      let bmiVal: number | null = null;
      if (ageMonths >= 24 && ageMonths <= 60 && height && weight && gender) {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (!isNaN(h) && !isNaN(w)) {
          const res = assessBmi(h, w, ageMonths, gender);
          bmiVal = res?.bmi ?? null;
        }
      }

      // Save routines + physical measurements
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
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        gender,
        bmi: bmiVal,
      };
      await updateChildRoutine(child.id, routine);

      // Reschedule notifications based on toggles
      const updatedChild = {
        ...child,
        name: name.trim(),
        date_of_birth: dob ? dob.toISOString().slice(0, 10) : child.date_of_birth,
        avatar_url: avatarUrl || null,
        bedtime: routine.bedtime,
        wake_up_time: routine.wake_up_time,
        breakfast_time: routine.breakfast_time,
        lunch_time: routine.lunch_time,
        snack_time: routine.snack_time,
        dinner_time: routine.dinner_time,
        nap_time: routine.nap_time,
        activity_time: routine.activity_time,
        learn_time: routine.learn_time,
        height_cm: routine.height_cm,
        weight_kg: routine.weight_kg,
        gender: routine.gender,
        bmi: routine.bmi,
      };
      await scheduleChildNotifications(updatedChild as Child, notifToggles);

      await loadChildren();
      setSubmitSuccess(`${name.trim()}'s settings updated!`);
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const childInitials = name.charAt(0).toUpperCase();

  // ── Sub-components ─────────────────────────────────────────────────────────

  const TimeField = ({
    label, icon, quickKey, h, m, p, setH, setM, setP,
  }: {
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
              <TouchableOpacity key={i} style={[styles.quickChip, h === t.h && m === t.m && p === t.p && styles.quickChipActive]} activeOpacity={0.7}
                onPress={() => { setH(t.h); setM(t.m); setP(t.p); }}>
                <Text style={[styles.quickChipText, h === t.h && m === t.m && p === t.p && styles.quickChipTextActive]}>{t.h}:{t.m} {t.p}</Text>
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!child) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7F60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{child.name}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#FF7F60" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Error Banner */}
        {submitError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorBannerText}>{submitError}</Text>
            <TouchableOpacity onPress={() => setSubmitError('')} hitSlop={8}>
              <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Success Banner */}
        {submitSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.successBannerText}>{submitSuccess}</Text>
          </View>
        ) : null}

        {/* Upload Error */}
        {uploadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorBannerText}>{uploadError}</Text>
            <TouchableOpacity onPress={() => setUploadError('')} hitSlop={8}>
              <Ionicons name="close" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={pickImage} activeOpacity={0.7}>
          {uploading ? (
            <View style={styles.avatar}><ActivityIndicator size="large" color="#FF7F60" /></View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#FFF0ED' }]}>
              <Text style={styles.avatarIcon}>{selectedIcon}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}><Ionicons name="camera" size={16} color="#FFFFFF" /></View>
          <Text style={styles.avatarHint}>Change photo</Text>
        </TouchableOpacity>

        {/* Icon picker */}
        <TouchableOpacity onPress={() => setShowIconPicker(true)} style={styles.iconPickerBtn}>
          <Text style={styles.iconPickerText}>Change icon</Text>
        </TouchableOpacity>

        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Name</Text>
          <View style={styles.inputWrapper}>
            <RNTextInput
              value={name}
              onChangeText={setName}
              placeholder="Child's name"
              style={styles.rnInput}
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Date of Birth</Text>
          <DatePicker
            value={dob}
            onChange={(d) => setDob(d)}
            maximumDate={new Date()}
          >
            <View style={styles.inputWrapper}>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 48, color: dob ? '#0F172A' : '#94A3B8', includeFontPadding: false }}>
                {dob ? formatDob(dob) : 'Select date'}
              </Text>
              {dob && (
                <TouchableOpacity onPress={() => setDob(null)} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
          </DatePicker>
        </View>

        {/* Gender */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Gender</Text>
          <View style={styles.chipRow}>
            {(['male', 'female'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gender === g && styles.chipActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                  {g === 'male' ? 'Boy' : 'Girl'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Height & Weight */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="resize-outline" size={16} color="#64748B" />
            <Text style={[styles.cardLabel, { marginLeft: 4 }]}>Height & Weight</Text>
          </View>
          <View style={styles.hwRow}>
            <View style={styles.hwField}>
              <Text style={styles.hwLabel}>Height (cm)</Text>
              <View style={styles.inputWrapper}>
                <RNTextInput
                  value={height}
                  onChangeText={setHeight}
                  placeholder="e.g. 110"
                  keyboardType="number-pad"
                  style={styles.rnInput}
                  placeholderTextColor="#94A3B8"
                  maxLength={5}
                />
              </View>
            </View>
            <View style={styles.hwField}>
              <Text style={styles.hwLabel}>Weight (kg)</Text>
              <View style={styles.inputWrapper}>
                <RNTextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 18"
                  keyboardType="number-pad"
                  style={styles.rnInput}
                  placeholderTextColor="#94A3B8"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
          {/* BMI Preview */}
          {bmiResult ? (
            <View style={styles.bmiPreview}>
              <Text style={styles.bmiText}>
                BMI: {bmiResult.bmi} ({bmiResult.percentile}th percentile, {bmiResult.label})
              </Text>
            </View>
          ) : ageMonths >= 24 && ageMonths <= 60 ? (
            <Text style={styles.bmiHint}>Enter height and weight to see BMI</Text>
          ) : (
            <Text style={styles.bmiHint}>BMI available for children ages 2–5</Text>
          )}
        </View>

        {/* Sleep Schedule */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="moon-outline" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Sleep Schedule</Text>
          </View>
          <TimeField label="Bedtime" icon="moon-outline" quickKey="bedtime"
            h={bedH} m={bedM} p={bedP} setH={setBedH} setM={setBedM} setP={setBedP} />
          <TimeField label="Wake-up" icon="sunny-outline" quickKey="wake"
            h={wakeH} m={wakeM} p={wakeP} setH={setWakeH} setM={setWakeM} setP={setWakeP} />
        </View>

        {/* Meal Times */}
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

        {/* Notifications — per routine */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications-outline" size={18} color="#6366F1" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <Text style={styles.notifDesc}>
            Toggle each reminder for {name || 'this child'}. Changes apply after saving.
          </Text>
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

      {/* Icon Picker Modal */}
      <Modal visible={showIconPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose an Icon</Text>
            <View style={styles.iconGrid}>
              {AVATAR_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconItem, selectedIcon === icon && styles.iconItemActive]}
                  onPress={() => {
                    setSelectedIcon(icon);
                    setShowIconPicker(false);
                  }}
                >
                  <Text style={styles.iconEmoji}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowIconPicker(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFBF6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#FFFDFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FF7F60' },
  scrollContent: { padding: 16 },

  // ── Banners ──
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '500' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0',
  },
  successBannerText: { flex: 1, fontSize: 13, color: '#10B981', fontWeight: '500' },

  // ── Avatar ──
  avatarSection: { alignItems: 'center', marginBottom: 4, position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FF7F60', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarIcon: { fontSize: 48 },
  cameraIcon: { position: 'absolute', bottom: 20, right: '35%', width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF7F60', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FEFBF6' },
  avatarHint: { fontSize: 12, color: '#64748B', marginTop: 8 },
  iconPickerBtn: { alignItems: 'center', marginBottom: 16, paddingVertical: 4 },
  iconPickerText: { fontSize: 13, color: '#FF7F60', fontWeight: '500' },

  // ── Cards ──
  card: { backgroundColor: '#FFFDFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  // ── Input wrapper ──
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEFBF6', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 12, height: 48,
  },
  rnInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 0, paddingHorizontal: 0, margin: 0, includeFontPadding: false },
  clearBtn: { padding: 4, marginLeft: 4 },

  // ── Gender chips ──
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FEFBF6', alignItems: 'center' },
  chipActive: { backgroundColor: '#FF7F60', borderColor: '#FF7F60' },
  chipText: { fontWeight: '600', color: '#64748B', fontSize: 14 },
  chipTextActive: { color: '#FFF' },

  // ── Height/Weight ──
  hwRow: { flexDirection: 'row', gap: 10 },
  hwField: { flex: 1 },
  hwLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },
  bmiPreview: { marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, alignItems: 'center' },
  bmiText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  bmiHint: { marginTop: 8, fontSize: 12, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' },

  // ── Duration ──
  durationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  durationLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  toggleTextOff: { color: '#EF4444' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  presetChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  presetChipActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  presetText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  presetTextActive: { color: '#FF7F60' },
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  durationCol: { alignItems: 'center', gap: 4 },
  stepperBtn: { width: 44, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  durationInput: { backgroundColor: '#FFFDFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', width: 72, height: 52, textAlign: 'center' },
  durationInputContent: { fontSize: 28, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  durationColon: { fontSize: 24, fontWeight: '300', color: '#CBD5E1', marginBottom: 28 },
  durationUnit: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  // ── Time field ──
  timeField: { marginBottom: 14 },
  timeFieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  timeFieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  quickChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: '#F1F5F9' },
  quickChipActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  quickChipText: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  quickChipTextActive: { color: '#FF7F60' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInputBox: { width: 48, height: 44, backgroundColor: '#FEFBF6', borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  timeInputRN: { width: '100%', height: '100%', fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', textAlignVertical: 'center', padding: 0, margin: 0, includeFontPadding: false },
  timeColon: { fontSize: 18, fontWeight: '300', color: '#CBD5E1' },
  ampmRow: { flexDirection: 'row', gap: 4, marginLeft: 4 },
  ampmBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  ampmBtnActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  ampmText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  ampmTextActive: { color: '#FF7F60' },

  // ── Notifications ──
  notifDesc: { fontSize: 12, color: '#94A3B8', marginBottom: 14, lineHeight: 18 },
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' },
  notifIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0F172A' },

  // ── Icon Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 20 },
  iconItem: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  iconItemActive: { borderColor: '#FF7F60', backgroundColor: '#FFF0ED' },
  iconEmoji: { fontSize: 32 },
  modalCloseBtn: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#F1F5F9', borderRadius: 12 },
  modalCloseText: { fontWeight: '600', color: '#0F172A' },
});
