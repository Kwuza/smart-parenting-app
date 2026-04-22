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
  Alert,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createChild,
  updateChildRoutine,
  updateChildSettings,
  RoutineData,
  getAgeMonths,
  Child,
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
    { h: '7', m: '30', p: 'PM' },
    { h: '8', m: '00', p: 'PM' },
    { h: '8', m: '30', p: 'PM' },
    { h: '9', m: '00', p: 'PM' },
    { h: '9', m: '30', p: 'PM' },
  ],
  wake: [
    { h: '5', m: '30', p: 'AM' },
    { h: '6', m: '00', p: 'AM' },
    { h: '6', m: '30', p: 'AM' },
    { h: '7', m: '00', p: 'AM' },
    { h: '7', m: '30', p: 'AM' },
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
  { key: 'profile', title: 'Profile', icon: 'person-outline' },
  { key: 'body', title: 'Body', icon: 'body-outline' },
  { key: 'sleep', title: 'Sleep', icon: 'moon-outline' },
  { key: 'meals', title: 'Meals', icon: 'restaurant-outline' },
  { key: 'active', title: 'Active', icon: 'fitness-outline' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

type TimeP = 'AM' | 'PM';

// ════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════

function toTimeStr(h: string, m: string, p: TimeP): string {
  let hour = parseInt(h) || 0;
  if (p === 'PM' && hour !== 12) hour += 12;
  if (p === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

// ════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════

export default function AddChildWizardScreen() {
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
  const [dob, setDob] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<AvatarIcon>('👶');
  const [showQuickAges, setShowQuickAges] = useState(false);

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
  const [useMinSleep, setUseMinSleep] = useState(false);
  const [minSleepH, setMinSleepH] = useState('10');
  const [minSleepM, setMinSleepM] = useState('0');

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
  const ageMonths = getAgeMonths(dob);
  const ageYears = Math.floor(ageMonths / 12);
  const isRequired = ageYears >= 2 && ageYears <= 5;
  const sleepRec = isRequired ? getSleepRecommendation(ageYears) : null;

  // Prefill min sleep when toggle enabled
  useEffect(() => {
    if (useMinSleep && sleepRec) {
      setMinSleepH(String(sleepRec.minHours));
      setMinSleepM('0');
    }
  }, [useMinSleep, sleepRec]);

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
  }, [height, weight, gender, ageMonths]);

  // Quick age set
  const setQuickAge = (years: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    setDob(date.toISOString().slice(0, 10));
    setShowQuickAges(false);
  };

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
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
          setError('Date of birth must be in format YYYY-MM-DD');
          return false;
        }
        const dobDate = new Date(dob);
        const today = new Date();
        if (dobDate > today) {
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

  // Navigation ----------------------------------------------------
  const handleNext = () => {
    if (validateStep()) {
      const order: StepKey[] = ['profile', 'body', 'sleep', 'meals', 'active'];
      const idx = order.indexOf(step);
      if (idx < order.length - 1) {
        setStep(order[idx + 1]);
      }
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
      const child = await createChild(name.trim(), dob, user.id, avatarUrl ?? undefined);

      // 2. Compute BMI if age-appropriate
      let bmiVal: number | null = null;
      if (ageMonths >= 24 && ageMonths <= 60 && height && weight && gender) {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (!isNaN(h) && !isNaN(w)) {
          const res = assessBmi(h, w, ageMonths, gender);
          bmiVal = res?.bmi ?? null;
        }
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

      // 4. Min sleep setting
      if (useMinSleep && minSleepH && minSleepM) {
        const total = parseInt(minSleepH) * 60 + parseInt(minSleepM);
        await updateChildSettings(child.id, { min_sleep_minutes: total, max_screen_time_minutes: null });
      }

      // 5. Notifications (use child with routine)
      await scheduleChildNotifications(updatedChild);

      // 6. Navigate
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
      {STEPS.map((s, i) => (
        <View
          key={s.key}
          style={[
            styles.dot,
            i <= stepIndex ? styles.dotActive : styles.dotInactive,
          ]}
        >
          {i < stepIndex ? (
            <Ionicons name="checkmark" size={10} color="#FFF" />
          ) : null}
        </View>
      ))}
    </View>
  );

  const renderTimeRow = (
    label: string,
    hVal: string,
    setH: (v: string) => void,
    mVal: string,
    setM: (v: string) => void,
    pVal: TimeP,
    setP: (v: TimeP) => void,
    presets: readonly { h: string; m: string; p: TimeP }[]
  ) => (
    <View style={styles.timeSection}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.presetGrid}>
        {presets.map((preset, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.presetBtn,
              hVal === preset.h && mVal === preset.m && pVal === preset.p && styles.presetBtnActive,
            ]}
            onPress={() => {
              setH(preset.h);
              setM(preset.m);
              setP(preset.p);
            }}
          >
            <Text style={[styles.presetBtnText, hVal === preset.h && mVal === preset.m && pVal === preset.p && styles.presetBtnTextActive]}>
              {preset.h}:{preset.m} {preset.p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeColLabel}>Hour</Text>
          <TextInput
            value={hVal}
            onChangeText={setH}
            keyboardType="number-pad"
            style={styles.timeInput}
            maxLength={2}
            placeholder="HH"
          />
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.timeColLabel}>Min</Text>
          <TextInput
            value={mVal}
            onChangeText={setM}
            keyboardType="number-pad"
            style={styles.timeInput}
            maxLength={2}
            placeholder="MM"
          />
        </View>
        <View style={styles.ampmRow}>
          <TouchableOpacity
            style={[styles.ampmBtn, pVal === 'AM' && styles.ampmBtnActive]}
            onPress={() => setP('AM')}
          >
            <Text style={[styles.ampmBtnText, pVal === 'AM' && styles.ampmBtnTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ampmBtn, pVal === 'PM' && styles.ampmBtnActive]}
            onPress={() => setP('PM')}
          >
            <Text style={[styles.ampmBtnText, pVal === 'PM' && styles.ampmBtnTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ── Render Steps ──
  const renderProfile = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Info</Text>
      <Text style={styles.stepSubtitle}>Tell us about your child.</Text>

      {/* Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Child's Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma"
            autoCapitalize="words"
            style={styles.input}
            underlineColorAndroid="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8"
            contentStyle={styles.inputContent}
            returnKeyType="next"
          />
        </View>
      </View>

      {/* DOB */}
      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity onPress={() => setShowQuickAges(!showQuickAges)}>
            <Text style={styles.quickSelect}>Quick select</Text>
          </TouchableOpacity>
        </View>
        {showQuickAges && (
          <View style={styles.quickAgesRow}>
            {['1', '3', '5', '7', '10'].map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => setQuickAge(Number(y))}
                style={styles.ageChip}
                activeOpacity={0.7}
              >
                <Text style={styles.ageChipText}>{y} yr{Number(y) > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            underlineColorAndroid="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8"
            contentStyle={styles.inputContent}
            maxLength={10}
          />
          {dob.length > 0 && (
            <TouchableOpacity onPress={() => setDob('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Avatar */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Avatar</Text>
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
            style={[styles.chip, gender === g && styles.chipActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
              {g === 'male' ? 'Boy' : 'Girl'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Height */}
      <View style={[styles.fieldGroup, { marginTop: 16 }]}>
        <Text style={styles.label}>Height (cm)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 110"
            keyboardType="number-pad"
            style={styles.input}
            underlineColorAndroid="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8"
            contentStyle={styles.inputContent}
          />
        </View>
      </View>

      {/* Weight */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Weight (kg)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 18"
            keyboardType="number-pad"
            style={styles.input}
            underlineColorAndroid="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8"
            contentStyle={styles.inputContent}
          />
        </View>
      </View>

      {/* BMI Preview */}
      <View style={styles.bmiPreview}>
        {bmiResult ? (
          <Text style={styles.bmiText}>
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

  const renderSleep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sleep Schedule</Text>
      <Text style={styles.stepSubtitle}>Set regular bed and wake times.</Text>

      {/* Dual column */}
      <View style={styles.sleepRow}>
        {/* Bedtime */}
        <View style={styles.sleepCol}>
          <Text style={styles.label}>Bedtime</Text>
          {renderTimeRow('', bedH, setBedH, bedM, setBedM, bedP, setBedP, QUICK_TIMES.bed)}
        </View>

        <View style={styles.sleepDivider} />

        {/* Wake-up */}
        <View style={styles.sleepCol}>
          <Text style={styles.label}>Wake-up</Text>
          {renderTimeRow('', wakeH, setWakeH, wakeM, setWakeM, wakeP, setWakeP, QUICK_TIMES.wake)}
        </View>
      </View>

      {/* Minimum Sleep */}
      {isRequired && (
        <>
          <View style={styles.fieldDivider} />
          <View style={styles.minSleepSection}>
            <View style={styles.minSleepToggle}>
              <Text style={styles.minSleepToggleLabel}>Minimum Sleep</Text>
              <TouchableOpacity
                style={[styles.toggle, useMinSleep && styles.toggleActive]}
                onPress={() => setUseMinSleep(!useMinSleep)}
              >
                <View style={[styles.toggleKnob, useMinSleep && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>
            {useMinSleep && (
              <View style={styles.minSleepRow}>
                <TextInput
                  value={minSleepH}
                  onChangeText={setMinSleepH}
                  keyboardType="number-pad"
                  style={styles.minSleepInput}
                  maxLength={2}
                  placeholder="hrs"
                />
                <Text style={styles.minSleepUnit}>hrs</Text>
                <TextInput
                  value={minSleepM}
                  onChangeText={setMinSleepM}
                  keyboardType="number-pad"
                  style={styles.minSleepInput}
                  maxLength={2}
                  placeholder="min"
                />
                <Text style={styles.minSleepUnit}>min</Text>
              </View>
            )}
            <Text style={styles.minSleepHint}>
              Recommended: {sleepRec?.label} for ages {ageYears}–{ageYears + 1}
            </Text>
          </View>
        </>
      )}
    </View>
  );

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
          {renderTimeRow(meal.label, meal.h, meal.setH, meal.m, meal.setM, meal.p, meal.setP, meal.presets)}
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
          {renderTimeRow(act.label, act.h, act.setH, act.m, act.setM, act.p, act.setP, act.presets)}
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Child</Text>
          <View style={{ width: 40 }} />
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
            onPress={step === 'active' && !isRequired ? handleSkipActive : handleNext}
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#FF7F60',
  },
  dotInactive: {
    backgroundColor: '#E2E8F0',
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
    paddingVertical: 8,
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
    marginTop: 8,
    paddingVertical: 8,
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
  chipActive: {
    backgroundColor: '#FF7F60',
    borderColor: '#FF7F60',
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  timeCol: {
    alignItems: 'center',
    flex: 1,
  },
  timeColLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  timeInput: {
    width: 56,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  ampmRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FEFBF6',
  },
  ampmBtnActive: {
    backgroundColor: '#FF7F60',
    borderColor: '#FF7F60',
  },
  ampmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  ampmBtnTextActive: {
    color: '#FFF',
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
