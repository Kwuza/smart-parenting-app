import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatePicker } from '../../components/DatePicker';
import {
  createChild,
  updateChildRoutine,
  updateChildSettings,
  RoutineData,
  getAgeMonths,
  formatDateLocal,
} from '../../lib/api';
import { pickAndUploadImage, UploadResult } from '../../lib/image';
import { assessBmi, BmiResult } from '../../lib/bmi';
import { getSleepRecommendation } from '../../lib/sleep-calculator';
import { scheduleChildNotifications } from '../../lib/notifications';
import { useApp, useAuth } from '../../stores/auth';

// ════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════

const AVATAR_ICONS = ['👶', '🧒', '👧', '👦', '🦁', '🐰', '🐻', '⭐'] as const;
type AvatarIcon = (typeof AVATAR_ICONS)[number];

const QUICK_TIMES = {
  bed: [
    { h: '8', m: '00', p: 'PM' },
    { h: '8', m: '30', p: 'PM' },
    { h: '9', m: '00', p: 'PM' },
  ],
  wake: [
    { h: '6', m: '00', p: 'AM' },
    { h: '6', m: '30', p: 'AM' },
    { h: '7', m: '00', p: 'AM' },
  ],
  breakfast: [
    { h: '6', m: '30', p: 'AM' },
    { h: '7', m: '00', p: 'AM' },
    { h: '7', m: '30', p: 'AM' },
    { h: '8', m: '00', p: 'AM' },
  ],
  lunch: [
    { h: '11', m: '30', p: 'AM' },
    { h: '12', m: '00', p: 'PM' },
    { h: '12', m: '30', p: 'PM' },
  ],
  snack: [
    { h: '2', m: '00', p: 'PM' },
    { h: '2', m: '30', p: 'PM' },
    { h: '3', m: '00', p: 'PM' },
  ],
  dinner: [
    { h: '5', m: '00', p: 'PM' },
    { h: '5', m: '30', p: 'PM' },
    { h: '6', m: '00', p: 'PM' },
    { h: '6', m: '30', p: 'PM' },
  ],
  nap: [
    { h: '12', m: '00', p: 'PM' },
    { h: '12', m: '30', p: 'PM' },
    { h: '1', m: '00', p: 'PM' },
    { h: '1', m: '30', p: 'PM' },
  ],
  activity: [
    { h: '9', m: '00', p: 'AM' },
    { h: '10', m: '00', p: 'AM' },
    { h: '3', m: '00', p: 'PM' },
    { h: '4', m: '00', p: 'PM' },
  ],
  learn: [
    { h: '9', m: '00', p: 'AM' },
    { h: '10', m: '00', p: 'AM' },
    { h: '2', m: '00', p: 'PM' },
    { h: '3', m: '00', p: 'PM' },
  ],
} as const;

const STEPS = [
  { key: 'profile', title: 'Profile', icon: 'person-outline', emoji: '👤' },
  { key: 'body', title: 'Body', icon: 'body-outline', emoji: '📏' },
  { key: 'sleep', title: 'Sleep', icon: 'moon-outline', emoji: '🌙' },
  { key: 'meals', title: 'Meals', icon: 'restaurant-outline', emoji: '🍽️' },
  { key: 'active', title: 'Active', icon: 'fitness-outline', emoji: '⚡' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

type TimeP = 'AM' | 'PM';

const BMI_COLORS: Record<string, { bg: string; text: string }> = {
  underweight: { bg: '#FEF3C7', text: '#D97706' }, // amber
  normal: { bg: '#ECFDF5', text: '#059669' },      // green
  overweight: { bg: '#FFF7ED', text: '#EA580C' },  // orange
  obese: { bg: '#FEF2F2', text: '#DC2626' },      // red
};

// ════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════

function toTimeStr(h: string, m: string, p: TimeP): string {
  let hour = parseInt(h) || 0;
  if (p === 'PM' && hour !== 12) hour += 12;
  if (p === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

function formatDob(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════

export default function AddChildWizardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { loadChildren } = useApp();

  const [step, setStep] = useState<StepKey>('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // ── Profile ──
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [nameError, setNameError] = useState('');
  const [dobError, setDobError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<AvatarIcon>('👶');
  // ── Body ──
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [bmiResult, setBmiResult] = useState<BmiResult | null>(null);

  // ── Sleep ──
  const [bedH, setBedH] = useState('9');
  const [bedM, setBedM] = useState('00');
  const [bedP, setBedP] = useState<TimeP>('PM');
  const [wakeH, setWakeH] = useState('7');
  const [wakeM, setWakeM] = useState('00');
  const [wakeP, setWakeP] = useState<TimeP>('AM');

  // ── Meals ──
  const [bfH, setBfH] = useState('7'); const [bfM, setBfM] = useState('00'); const [bfP, setBfP] = useState<TimeP>('AM');
  const [luH, setLuH] = useState('12'); const [luM, setLuM] = useState('00'); const [luP, setLuP] = useState<TimeP>('PM');
  const [snH, setSnH] = useState('2'); const [snM, setSnM] = useState('30'); const [snP, setSnP] = useState<TimeP>('PM');
  const [diH, setDiH] = useState('6'); const [diM, setDiM] = useState('00'); const [diP, setDiP] = useState<TimeP>('PM');

  // ── Active ──
  const [napH, setNapH] = useState('12'); const [napM, setNapM] = useState('30'); const [napP, setNapP] = useState<TimeP>('PM');
  const [actH, setActH] = useState('3'); const [actM, setActM] = useState('00'); const [actP, setActP] = useState<TimeP>('PM');
  const [lrnH, setLrnH] = useState('2'); const [lrnM, setLrnM] = useState('00'); const [lrnP, setLrnP] = useState<TimeP>('PM');

  // ── Computed ──
  const dobStr = dob ? formatDateLocal(dob) : '';
  const ageMonths = getAgeMonths(dobStr);
  const ageYears = Math.floor(ageMonths / 12);
  const isRequired = ageYears >= 2 && ageYears <= 5;
  const sleepRec = isRequired ? getSleepRecommendation(ageYears) : null;

  // Live BMI preview (body step)
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
    const res = assessBmi(h, w, ageMonths, gender);
    setBmiResult(res);
    if (__DEV__) {
      console.log('[Wizard BMI Preview]', { h, w, ageMonths, gender, res });
    }
  }, [height, weight, gender, ageMonths]);

  // Date picker handled by DatePicker component

  // Photo picker + immediate upload
  const handlePickPhoto = async () => {
    if (!user?.id) {
      setError('Must be signed in to upload photo');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const result: UploadResult | null = await pickAndUploadImage({
        userId: user.id,
        folder: 'child-avatars',
      });
      if (result) {
        setAvatarUrl(result.url);
      } else {
        setError('Photo selection cancelled');
      }
    } catch (e: any) {
      setError('Photo upload failed — you can continue without it');
    } finally {
      setUploading(false);
    }
  };

  // Inline validation (Step 1 — runs on each keystroke / date change)
  const validateName = (v: string) => {
    if (!v.trim()) { setNameError('Name is required'); return; }
    if (v.trim().length < 2) { setNameError('Name must be at least 2 characters'); return; }
    setNameError('');
  };

  const validateDob = (d: Date | null) => {
    if (!d) { setDobError('Date of birth is required'); return; }
    if (d > new Date()) { setDobError('Date of birth cannot be in the future'); return; }
    setDobError('');
  };

  // Validation ----------------------------------------------------
  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 'profile':
        if (!name.trim()) {
          setError('Please enter your child\'s name');
          return false;
        }
        if (name.trim().length < 2) {
          setError('Name must be at least 2 characters');
          return false;
        }
        if (!dob) {
          setError('Please select date of birth');
          return false;
        }
        const today = new Date();
        if (dob > today) {
          setError('Date of birth cannot be in the future');
          return false;
        }
        return true;
      case 'body':
        if (!gender) {
          setError('Please select a gender');
          return false;
        }
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (!h || h < 30 || h > 250) {
          setError('Enter a valid height (30–250 cm)');
          return false;
        }
        if (!w || w < 2 || w > 200) {
          setError('Enter a valid weight (2–200 kg)');
          return false;
        }
        return true;
      case 'sleep':
        if (!bedH || !wakeH) {
          setError('Please set both bedtime and wake-up time');
          return false;
        }
        return true;
      case 'meals':
        if (!bfH || !luH || !snH || !diH) {
          setError('Please set all four meal times');
          return false;
        }
        return true;
      case 'active':
        if (isRequired && (!napH || !actH || !lrnH)) {
          setError('Please set all activity times for ages 2–5');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // Clears profile inline errors when user navigates back to Step 1
  const setStepWithClear = (next: StepKey) => {
    if (next === 'profile') {
      setNameError('');
      setDobError('');
    }
    setStep(next);
  };

  // Navigation ----------------------------------------------------
  const handleNext = () => {
    if (validateStep()) {
      const order: StepKey[] = ['profile', 'body', 'sleep', 'meals', 'active'];
      const idx = order.indexOf(step);
      if (idx < order.length - 1) {
        setStepWithClear(order[idx + 1]);
      }
    }
  };

  const handleBack = () => {
    const order: StepKey[] = ['profile', 'body', 'sleep', 'meals', 'active'];
    const idx = order.indexOf(step);
    if (idx > 0) {
      setStepWithClear(order[idx - 1]);
    }
  };

  const handleSkipActive = () => {
    setStep('active'); // bypass validation via Complete flow
    handleSubmit();
  };

  // Final submit -------------------------------------------------
  const handleSubmit = async () => {
    // Validate all required fields one last time before API
    if (!validateStep()) return;

    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('You must be signed in');

      // 1. Create child profile (avatarUrl may be null)
      const child = await createChild(
        name.trim(),
        formatDateLocal(dob!),
        user.id,
        avatarUrl || undefined
      );

      // 2. Compute BMI if age-appropriate
      let bmiVal: number | null = null;
      if (ageMonths >= 24 && ageMonths <= 60 && height && weight && gender) {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (!isNaN(h) && !isNaN(w)) {
          const res = assessBmi(h, w, ageMonths, gender);
          bmiVal = res?.bmi ?? null;
          if (__DEV__) {
            console.log('[Wizard BMI]', { h, w, ageMonths, gender, bmiVal, res });
          }
        }
      } else if (__DEV__) {
        console.log('[Wizard BMI] skipped — guard failed', { ageMonths, hasHeight: !!height, hasWeight: !!weight, hasGender: !!gender });
      }

      // 3. Build routine payload
      const routine: RoutineData = {
        bedtime: toTimeStr(bedH, bedM, bedP),
        wake_up_time: toTimeStr(wakeH, wakeM, wakeP),
        breakfast_time: toTimeStr(bfH, bfM, bfP),
        lunch_time: toTimeStr(luH, luM, luP),
        snack_time: toTimeStr(snH, snM, snP),
        dinner_time: toTimeStr(diH, diM, diP),
        nap_time: toTimeStr(napH, napM, napP),
        activity_time: toTimeStr(actH, actM, actP),
        learn_time: toTimeStr(lrnH, lrnM, lrnP),
        height_cm: parseFloat(height) || null,
        weight_kg: parseFloat(weight) || null,
        gender,
        bmi: bmiVal,
      };
      const updatedChild = await updateChildRoutine(child.id, routine);

      // 4. Save min sleep setting if enabled (ages 2-5)
      // REMOVED: minimum sleep UI removed; auto-calculated from bed/wake times

      // 5. Notifications — default all OFF so user opts in per child
      const defaultNotifs: Record<string, boolean> = {
        bedtime: false, wake_up: false,
        breakfast: false, lunch: false, snack: false, dinner: false,
        nap: false, activity: false, learn: false,
        weekly_growth: false,
      };
      await updateChildSettings(child.id, { notifications: defaultNotifs });
      await scheduleChildNotifications(updatedChild, defaultNotifs);
      if (__DEV__) {
        console.log(`[Wizard] Child created with all notifications OFF by default`);
      }
      await loadChildren();
      const { Keyboard } = require('react-native');
      Keyboard.dismiss();
      router.replace('/(tabs)/' as any);
    } catch (e: any) {
      setError(e.message || 'Failed to create child profile');
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ──
  const stepIndex = STEPS.findIndex(s => s.key === step);
  const renderStepDots = () => (
    <View style={styles.stepDots}>
      {STEPS.map((s, i) => {
        const isDone = i < stepIndex;
        const isActive = i === stepIndex;
        return (
          <View key={s.key} style={styles.stepTrackRow}>
            <View style={[
              styles.stepCircle,
              isDone && styles.stepCircleDone,
              isActive && styles.stepCircleActive,
            ]}>
              <Text style={[
                styles.stepEmoji,
                isDone && styles.stepEmojiDone,
                isActive && styles.stepEmojiActive,
              ]}>
                {isDone ? '✓' : s.emoji}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <Text style={[
                styles.stepArrow,
                isDone && styles.stepArrowDone,
              ]}>→</Text>
            )}
          </View>
        );
      })}
    </View>
  );

  // ── Compact time block (replaces renderTimeRow) ──
  const CompactTimeBlock = ({
    label,
    hour,
    minute,
    period,
    onHourChange,
    onMinuteChange,
    onPeriodChange,
    presets,
  }: {
    label: string;
    hour: string;
    minute: string;
    period: TimeP;
    onHourChange: (v: string) => void;
    onMinuteChange: (v: string) => void;
    onPeriodChange: (v: TimeP) => void;
    presets: readonly { h: string; m: string; p: TimeP }[];
  }) => (
    <View style={styles.compactTimeRow}>
      {/* Label */}
      <Text style={styles.compactTimeLabel}>{label}</Text>

      {/* Right side: presets + digits */}
      <View style={styles.compactTimeRight}>
        {/* Presets */}
        <View style={styles.compactPresetRow}>
          {presets.slice(0, 3).map((preset, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.compactPresetBtn,
                hour === preset.h && minute === preset.m && period === preset.p && styles.compactPresetBtnActive,
              ]}
              onPress={() => {
                onHourChange(preset.h);
                onMinuteChange(preset.m);
                onPeriodChange(preset.p);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.compactPresetText,
                hour === preset.h && minute === preset.m && period === preset.p && styles.compactPresetTextActive,
              ]}>
                {preset.h}:{preset.m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big digits */}
        <View style={styles.compactDigitRow}>
          <View style={styles.compactDigitCol}>
            <TouchableOpacity
              style={styles.compactStepper}
              activeOpacity={0.6}
              onPress={() => onHourChange(String(Math.min(12, (parseInt(hour) || 0) + 1)))}
            >
              <Ionicons name="add" size={14} color="#FF7F60" />
            </TouchableOpacity>
            <RNTextInput
              value={hour}
              onChangeText={(t) => {
                const n = Math.min(12, Math.max(1, parseInt(t.replace(/[^0-9]/g, '')) || 0));
                onHourChange(String(n));
              }}
              keyboardType="numeric"
              style={styles.compactDigit}
              maxLength={2}
              selectTextOnFocus
              placeholder="12"
              placeholderTextColor="#CBD5E1"
            />
            <TouchableOpacity
              style={styles.compactStepper}
              activeOpacity={0.6}
              onPress={() => onHourChange(String(Math.max(1, (parseInt(hour) || 0) - 1)))}
            >
              <Ionicons name="remove" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.compactColon}>:</Text>
          <View style={styles.compactDigitCol}>
            <TouchableOpacity
              style={styles.compactStepper}
              activeOpacity={0.6}
              onPress={() => onMinuteChange(String(Math.min(59, (parseInt(minute) || 0) + 5)))}
            >
              <Ionicons name="add" size={14} color="#FF7F60" />
            </TouchableOpacity>
            <RNTextInput
              value={minute}
              onChangeText={(t) => {
                const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0));
                onMinuteChange(String(n).padStart(2, '0'));
              }}
              keyboardType="numeric"
              style={styles.compactDigit}
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor="#CBD5E1"
            />
            <TouchableOpacity
              style={styles.compactStepper}
              activeOpacity={0.6}
              onPress={() => onMinuteChange(String(Math.max(0, (parseInt(minute) || 0) - 5)))}
            >
              <Ionicons name="remove" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.compactPeriodCol}>
            {(['AM', 'PM'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.compactPeriodBtn, period === p && styles.compactPeriodBtnActive]}
                onPress={() => onPeriodChange(p)}
              >
                <Text style={[styles.compactPeriodText, period === p && styles.compactPeriodTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  // ── Render Steps ──
  const renderProfile = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Info</Text>
      <Text style={styles.stepSubtitle}>Tell us about your child.</Text>

      {/* Avatar */}
      <View style={styles.fieldGroup}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            {uploading ? (
              <ActivityIndicator color="#FF7F60" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{selectedIcon}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowIconPicker(true)} style={styles.changeAvatarBtn}>
            <Text style={styles.changeAvatarText}>Change Icon</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickPhoto} style={styles.uploadPhotoBtn} disabled={uploading}>
            <Ionicons name="camera-outline" size={16} color="#FF7F60" />
            <Text style={styles.uploadPhotoText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Child's Name</Text>
        <View style={styles.inputWrapper}>
          <RNTextInput
            value={name}
            onChangeText={(v) => { setName(v); validateName(v); }}
            placeholder="e.g. Emma"
            autoCapitalize="words"
            style={[styles.rnInput, nameError ? styles.rnInputError : null]}
            placeholderTextColor="#94A3B8"
            returnKeyType="next"
          />
        </View>
        {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
      </View>

      {/* Date of Birth */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of Birth</Text>
        <DatePicker
          value={dob}
          onChange={(d) => { setDob(d); validateDob(d); }}
          maximumDate={new Date()}
        >
          <View style={[styles.inputWrapper, dobError ? styles.inputError : null]}>
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 52, color: dob ? '#0F172A' : '#94A3B8', includeFontPadding: false }}>
              {dob ? formatDob(dob) : 'Select date'}
            </Text>
            {dob && (
              <TouchableOpacity onPress={() => setDob(null)} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </DatePicker>
        {dobError ? <Text style={styles.fieldError}>{dobError}</Text> : null}
      </View>
    </View>
  );

  const renderBody = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Physical Measurements</Text>
      <Text style={styles.stepSubtitle}>Needed for BMI tracking.</Text>

      {/* Gender */}
      <Text style={styles.label}>Gender</Text>
      <View style={styles.chipRow}>
        {(['male', 'female'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.chip,
              gender === g && (g === 'male' ? styles.chipActiveMale : styles.chipActiveFemale),
            ]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
              {g === 'male' ? '♂ Boy' : '♀ Girl'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Height */}
      <View style={[styles.fieldGroup, { marginTop: 16 }]}>
        <Text style={styles.label}>Height (cm)</Text>
        <View style={styles.inputWrapper}>
          <RNTextInput
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 110"
            keyboardType="number-pad"
            style={styles.rnInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* Weight */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Weight (kg)</Text>
        <View style={styles.inputWrapper}>
          <RNTextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 18"
            keyboardType="number-pad"
            style={styles.rnInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* BMI Preview */}
      <View style={[
        styles.bmiPreview,
        bmiResult && { backgroundColor: BMI_COLORS[bmiResult.category].bg },
      ]}>
        {bmiResult ? (
          <Text style={[
            styles.bmiText,
            { color: BMI_COLORS[bmiResult.category].text },
          ]}>
            BMI: {bmiResult.bmi} ({bmiResult.percentile}th percentile, {bmiResult.label})
          </Text>
        ) : ageMonths >= 24 && ageMonths <= 60 ? (
          <Text style={styles.bmiTextSubtle}>Enter valid height and weight to see BMI</Text>
        ) : (
          <Text style={styles.bmiTextSubtle}>BMI available for children ages 2–5</Text>
        )}
      </View>
    </View>
  );

  const renderSleep = () => {
    // Calculate sleep duration
    const calcSleepMinutes = () => {
      let bH = parseInt(bedH) || 0;
      let bM = parseInt(bedM) || 0;
      let wH = parseInt(wakeH) || 0;
      let wM = parseInt(wakeM) || 0;
      if (bedP === 'PM' && bH !== 12) bH += 12;
      if (bedP === 'AM' && bH === 12) bH = 0;
      if (wakeP === 'PM' && wH !== 12) wH += 12;
      if (wakeP === 'AM' && wH === 12) wH = 0;
      let bedTotal = bH * 60 + bM;
      let wakeTotal = wH * 60 + wM;
      if (wakeTotal <= bedTotal) wakeTotal += 24 * 60;
      return wakeTotal - bedTotal;
    };
    const totalSleepMins = calcSleepMinutes();
    const sleepDurH = Math.floor(totalSleepMins / 60);
    const sleepDurM = totalSleepMins % 60;
    const sleepDurText = totalSleepMins > 0
      ? `${sleepDurH > 0 ? `${sleepDurH}h ` : ''}${sleepDurM > 0 ? `${sleepDurM}m` : ''}`.trim()
      : '--';
    const belowRec = isRequired && sleepRec && totalSleepMins > 0 && totalSleepMins < sleepRec.minHours * 60;

    const SleepTimeBlock = ({
      label,
      hour,
      minute,
      period,
      onHourChange,
      onMinuteChange,
      onPeriodChange,
      presets,
    }: {
      label: string;
      hour: string;
      minute: string;
      period: TimeP;
      onHourChange: (v: string) => void;
      onMinuteChange: (v: string) => void;
      onPeriodChange: (v: TimeP) => void;
      presets: readonly { h: string; m: string; p: TimeP }[];
    }) => (
      <View style={styles.sleepTimeBlock}>
        <Text style={styles.sleepTimeBlockLabel}>{label}</Text>
        {/* Presets */}
        <View style={styles.sleepPresetRow}>
          {presets.map((preset, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.sleepPresetBtn,
                hour === preset.h && minute === preset.m && period === preset.p && styles.sleepPresetBtnActive,
              ]}
              onPress={() => {
                onHourChange(preset.h);
                onMinuteChange(preset.m);
                onPeriodChange(preset.p);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.sleepPresetBtnText,
                hour === preset.h && minute === preset.m && period === preset.p && styles.sleepPresetBtnTextActive,
              ]}>
                {preset.h}:{preset.m} {preset.p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Big digit inputs */}
        <View style={styles.sleepDigitRow}>
          <View style={styles.sleepDigitCol}>
            <TouchableOpacity
              style={styles.sleepStepperBtn}
              activeOpacity={0.6}
              onPress={() => onHourChange(String(Math.min(12, (parseInt(hour) || 0) + 1)))}
            >
              <Ionicons name="add" size={18} color="#FF7F60" />
            </TouchableOpacity>
            <RNTextInput
              value={hour}
              onChangeText={(t) => {
                const n = Math.min(12, Math.max(1, parseInt(t.replace(/[^0-9]/g, '')) || 0));
                onHourChange(String(n));
              }}
              keyboardType="numeric"
              style={styles.sleepDigitText}
              maxLength={2}
              selectTextOnFocus
              placeholder="12"
              placeholderTextColor="#CBD5E1"
            />
            <TouchableOpacity
              style={styles.sleepStepperBtn}
              activeOpacity={0.6}
              onPress={() => onHourChange(String(Math.max(1, (parseInt(hour) || 0) - 1)))}
            >
              <Ionicons name="remove" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sleepDigitColon}>:</Text>
          <View style={styles.sleepDigitCol}>
            <TouchableOpacity
              style={styles.sleepStepperBtn}
              activeOpacity={0.6}
              onPress={() => onMinuteChange(String(Math.min(59, (parseInt(minute) || 0) + 5)))}
            >
              <Ionicons name="add" size={18} color="#FF7F60" />
            </TouchableOpacity>
            <RNTextInput
              value={minute}
              onChangeText={(t) => {
                const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0));
                onMinuteChange(String(n).padStart(2, '0'));
              }}
              keyboardType="numeric"
              style={styles.sleepDigitText}
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor="#CBD5E1"
            />
            <TouchableOpacity
              style={styles.sleepStepperBtn}
              activeOpacity={0.6}
              onPress={() => onMinuteChange(String(Math.max(0, (parseInt(minute) || 0) - 5)))}
            >
              <Ionicons name="remove" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.sleepPeriodCol}>
            {(['AM', 'PM'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.sleepPeriodBtn, period === p && styles.sleepPeriodBtnActive]}
                onPress={() => onPeriodChange(p)}
              >
                <Text style={[styles.sleepPeriodText, period === p && styles.sleepPeriodTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Sleep Schedule</Text>
        <Text style={styles.stepSubtitle}>Set regular bed and wake times.</Text>

        <View style={styles.sleepRow}>
          <SleepTimeBlock
            label="Bedtime"
            hour={bedH}
            minute={bedM}
            period={bedP}
            onHourChange={setBedH}
            onMinuteChange={setBedM}
            onPeriodChange={setBedP}
            presets={QUICK_TIMES.bed}
          />

          <View style={styles.sleepDivider} />

          <SleepTimeBlock
            label="Wake-up"
            hour={wakeH}
            minute={wakeM}
            period={wakeP}
            onHourChange={setWakeH}
            onMinuteChange={setWakeM}
            onPeriodChange={setWakeP}
            presets={QUICK_TIMES.wake}
          />
        </View>

        {/* Sleep duration + warning */}
        <View style={styles.sleepDurationCard}>
          <View style={styles.sleepDurationRow}>
            <Ionicons name="time-outline" size={18} color="#94A3B8" />
            <Text style={styles.sleepDurationLabel}>Sleep Duration</Text>
            <Text style={[styles.sleepDurationValue, belowRec && styles.sleepDurationValueWarning]}>
              {sleepDurText}
            </Text>
          </View>
          {belowRec && sleepRec && (
            <View style={styles.sleepWarningRow}>
              <Ionicons name="warning-outline" size={14} color="#EA580C" />
              <Text style={styles.sleepWarningText}>
                Below recommended {sleepRec.label} for age {ageYears}
              </Text>
            </View>
          )}
          {isRequired && sleepRec && !belowRec && totalSleepMins > 0 && (
            <Text style={styles.sleepRecText}>
              Recommended: {sleepRec.label} for ages {ageYears}–{ageYears + 1}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderMeals = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Meal Times</Text>
      <Text style={styles.stepSubtitle}>Set typical meal schedules.</Text>

      {[
        { label: 'Breakfast', h: bfH, setH: setBfH, m: bfM, setM: setBfM, p: bfP, setP: setBfP, presets: QUICK_TIMES.breakfast },
        { label: 'Lunch', h: luH, setH: setLuH, m: luM, setM: setLuM, p: luP, setP: setLuP, presets: QUICK_TIMES.lunch },
        { label: 'Snack', h: snH, setH: setSnH, m: snM, setM: setSnM, p: snP, setP: setSnP, presets: QUICK_TIMES.snack },
        { label: 'Dinner', h: diH, setH: setDiH, m: diM, setM: setDiM, p: diP, setP: setDiP, presets: QUICK_TIMES.dinner },
      ].map((meal, i) => (
        <View key={i} style={styles.mealRow}>
          <CompactTimeBlock
            label={meal.label}
            hour={meal.h}
            minute={meal.m}
            period={meal.p}
            onHourChange={meal.setH}
            onMinuteChange={meal.setM}
            onPeriodChange={meal.setP}
            presets={meal.presets}
          />
        </View>
      ))}
    </View>
  );

  const renderActive = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {isRequired ? 'Activities (required)' : 'Activities (optional)'}
      </Text>
      <Text style={styles.stepSubtitle}>
        {isRequired ? 'Daily routines for ages 2–5.' : 'For ages 6+, these are optional.'}
      </Text>

      {[
        { label: 'Nap', h: napH, setH: setNapH, m: napM, setM: setNapM, p: napP, setP: setNapP, presets: QUICK_TIMES.nap },
        { label: 'Activity', h: actH, setH: setActH, m: actM, setM: setActM, p: actP, setP: setActP, presets: QUICK_TIMES.activity },
        { label: 'Learning', h: lrnH, setH: setLrnH, m: lrnM, setM: setLrnM, p: lrnP, setP: setLrnP, presets: QUICK_TIMES.learn },
      ].map((act, i) => (
        <View key={i} style={styles.mealRow}>
          <CompactTimeBlock
            label={act.label}
            hour={act.h}
            minute={act.m}
            period={act.p}
            onHourChange={act.setH}
            onMinuteChange={act.setM}
            onPeriodChange={act.setP}
            presets={act.presets}
          />
        </View>
      ))}

      {!isRequired && (
        <TouchableOpacity onPress={handleSkipActive} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Skip and Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Main render ──
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
          {stepIndex > 0 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <Text style={styles.headerTitle}>Add Child</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Step indicator */}
        {renderStepDots()}
        <Text style={styles.stepLabel}>{STEPS[stepIndex].title}</Text>

        {/* Step content */}
        {step === 'profile' && renderProfile()}
        {step === 'body' && renderBody()}
        {step === 'sleep' && renderSleep()}
        {step === 'meals' && renderMeals()}
        {step === 'active' && renderActive()}

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Bottom button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            onPress={step === 'active' && isRequired ? handleSubmit : step === 'active' && !isRequired ? handleSkipActive : handleNext}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              styles.primaryBtn,
              (step === 'active' && isRequired) && styles.completeBtn,
              loading && styles.btnDisabled,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Saving…' : step === 'active' && isRequired ? 'Complete Setup' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
          <Text style={styles.privacyText}>Your child's data is private and only visible to you.</Text>
        </View>
      </ScrollView>

      {/* Icon picker modal */}
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
    </KeyboardAvoidingView>
  );
}

// ════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  stepTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: '#FF7F60',
    backgroundColor: '#FFF0ED',
  },
  stepCircleDone: {
    borderColor: '#FF7F60',
    backgroundColor: '#FF7F60',
  },
  stepEmoji: {
    fontSize: 16,
  },
  stepEmojiActive: {
    fontSize: 18,
  },
  stepEmojiDone: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepArrow: {
    fontSize: 16,
    color: '#CBD5E1',
    marginHorizontal: 6,
    fontWeight: '500',
  },
  stepArrowDone: {
    color: '#FF7F60',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
  },
  stepContent: {
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickSelect: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF7F60',
  },
  quickAgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ageChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#FFE5E0',
  },
  ageChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF7F60',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFBF6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 14,
    height: 52,
    color: '#0F172A',
  },
  rnInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
  },
  rnInputError: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  inputContent: {
    paddingHorizontal: 0,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 24,
    marginTop: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    shadowColor: '#FF7F60',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtn: {
    backgroundColor: '#FF7F60',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtn: {
    // same style
  },
  btnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0.08,
    elevation: 1,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  privacyText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  changeAvatarBtn: {
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  changeAvatarText: {
    color: '#FF7F60',
    fontWeight: '500',
    fontSize: 14,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingVertical: 4,
  },
  uploadPhotoText: {
    color: '#FF7F60',
    fontWeight: '500',
    fontSize: 14,
  },

  // ── Body / BMI ──
  chipRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
    alignItems: 'center',
  },
  chipActiveMale: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipActiveFemale: {
    backgroundColor: '#EC4899',
    borderColor: '#EC4899',
  },
  chipText: {
    fontWeight: '600',
    color: '#64748B',
    fontSize: 15,
  },
  chipTextActive: {
    color: '#FFF',
  },
  bmiPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
  },
  bmiText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  bmiTextSubtle: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },

  // ── Sleep ──
  sleepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sleepCol: {
    flex: 1,
    alignItems: 'center',
  },
  sleepDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timeSection: {
    width: '100%',
    marginBottom: 8,
  },

  // ── Compact time block (meals / active) ──
  compactTimeRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFDFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  compactTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactPresetRow: {
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 4,
    marginRight: 4,
  },
  compactPresetBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
  },
  compactPresetBtnActive: {
    backgroundColor: '#FF7F60',
    borderColor: '#FF7F60',
  },
  compactPresetText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  compactPresetTextActive: {
    color: '#FFF',
  },
  compactDigitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  compactDigitCol: {
    alignItems: 'center',
    gap: 2,
  },
  compactStepper: {
    width: 28,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDigit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: 36,
    paddingVertical: 1,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  compactColon: {
    fontSize: 18,
    fontWeight: '300',
    color: '#CBD5E1',
    marginBottom: 14,
  },
  compactPeriodCol: {
    marginLeft: 2,
    gap: 2,
    marginBottom: 14,
  },
  compactPeriodBtn: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  compactPeriodBtnActive: {
    backgroundColor: '#FFF0ED',
    borderColor: '#FF7F60',
  },
  compactPeriodText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  compactPeriodTextActive: {
    color: '#FF7F60',
  },

  // ── Sleep step: big digit time blocks ──
  sleepTimeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  sleepTimeBlockLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sleepPresetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  sleepPresetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
  },
  sleepPresetBtnActive: {
    backgroundColor: '#FF7F60',
    borderColor: '#FF7F60',
  },
  sleepPresetBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  sleepPresetBtnTextActive: {
    color: '#FFF',
  },
  sleepDigitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  sleepDigitCol: {
    alignItems: 'center',
    gap: 3,
  },
  sleepStepperBtn: {
    width: 36,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepDigitText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: 48,
    paddingVertical: 2,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  sleepDigitColon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#CBD5E1',
    marginBottom: 20,
  },
  sleepPeriodCol: {
    marginLeft: 4,
    gap: 3,
    marginBottom: 20,
  },
  sleepPeriodBtn: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sleepPeriodBtnActive: {
    backgroundColor: '#FFF0ED',
    borderColor: '#FF7F60',
  },
  sleepPeriodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sleepPeriodTextActive: {
    color: '#FF7F60',
  },
  sleepDurationCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sleepDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sleepDurationLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  sleepDurationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sleepDurationValueWarning: {
    color: '#EA580C',
  },
  sleepWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  sleepWarningText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EA580C',
  },
  sleepRecText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
  },

  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
  },
  presetBtnActive: {
    backgroundColor: '#FF7F60',
    borderColor: '#FF7F60',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  presetBtnTextActive: {
    color: '#FFF',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  minSleepSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  minSleepToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  minSleepToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#FF7F60',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  minSleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  minSleepInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  rnMinSleepInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
    margin: 0,
  },
  minSleepUnit: {
    fontSize: 13,
    color: '#64748B',
  },
  minSleepHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── Meals / Active rows ──
  mealRow: {
    marginBottom: 16,
  },
  skipBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    color: '#FF7F60',
    fontWeight: '600',
    fontSize: 15,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  iconItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconItemActive: {
    borderColor: '#FF7F60',
    backgroundColor: '#FFF0ED',
  },
  iconEmoji: {
    fontSize: 32,
  },
  modalCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  modalCloseText: {
    fontWeight: '600',
    color: '#0F172A',
  },
});
