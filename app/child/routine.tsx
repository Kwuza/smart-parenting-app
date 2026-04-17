/**
 * Routine Setup Wizard — 4-step flow for child routine configuration.
 *
 * Step 1: Sleep (bedtime, wake-up) — required for all ages
 * Step 2: Meals (breakfast, lunch, snack, dinner) — required for all ages
 * Step 3: Activities (nap, activity, learn) — required 2-5, optional 6+
 * Step 4: Physical (height, weight → BMI) — required for all ages
 *
 * Triggered after creating a new child profile.
 * Can also be re-opened from settings for editing.
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Child, RoutineData, getAgeGroup, getAgeMonths, updateChildRoutine } from '../../lib/api';
import { assessBmi, BmiResult } from '../../lib/bmi';
import { scheduleChildNotifications } from '../../lib/notifications';
import { useApp } from '../../stores/auth';

const STEPS = [
  { key: 'sleep', title: 'Sleep Schedule', icon: 'moon-outline' },
  { key: 'meals', title: 'Meal Times', icon: 'restaurant-outline' },
  { key: 'activities', title: 'Activities', icon: 'fitness-outline' },
  { key: 'physical', title: 'Physical', icon: 'body-outline' },
];

const QUICK_TIMES: Record<string, { h: string; m: string; p: 'AM' | 'PM' }[]> = {
  bedtime: [
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
};

// Convert AM/PM → TIME string (HH:MM:00)
function toTimeStr(h: string, m: string, p: 'AM' | 'PM'): string {
  let hour = parseInt(h) || 0;
  if (p === 'PM' && hour !== 12) hour += 12;
  if (p === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

// Convert TIME string → AM/PM parts
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

export default function RoutineWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId: string }>();
  const { children, loadChildren } = useApp();

  const child = children.find(c => c.id === params.childId);
  const ageGroup = child ? getAgeGroup(child.date_of_birth) : 'toddler';
  const ageMonths = child ? getAgeMonths(child.date_of_birth) : 0;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Sleep
  const [bedH, setBedH] = useState('');
  const [bedM, setBedM] = useState('');
  const [bedP, setBedP] = useState<'AM' | 'PM'>('PM');
  const [wakeH, setWakeH] = useState('');
  const [wakeM, setWakeM] = useState('');
  const [wakeP, setWakeP] = useState<'AM' | 'PM'>('AM');

  // Step 2: Meals
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

  // Step 3: Activities
  const [napH, setNapH] = useState('');
  const [napM, setNapM] = useState('');
  const [napP, setNapP] = useState<'AM' | 'PM'>('PM');
  const [actH, setActH] = useState('');
  const [actM, setActM] = useState('');
  const [actP, setActP] = useState<'AM' | 'PM'>('AM');
  const [lrnH, setLrnH] = useState('');
  const [lrnM, setLrnM] = useState('');
  const [lrnP, setLrnP] = useState<'AM' | 'PM'>('AM');

  // Step 4: Physical
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [bmiResult, setBmiResult] = useState<BmiResult | null>(null);

  // Load existing data if editing
  useEffect(() => {
    if (!child) return;
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
    if (child.height_cm) setHeight(child.height_cm.toString());
    if (child.weight_kg) setWeight(child.weight_kg.toString());
    if (child.gender) setGender(child.gender);
  }, [child]);

  // Live BMI calculation
  useEffect(() => {
    if (!child || !height || !weight || ageMonths < 24 || !gender) {
      setBmiResult(null);
      return;
    }
    const result = assessBmi(parseFloat(height), parseFloat(weight), ageMonths, gender);
    setBmiResult(result);
  }, [height, weight, ageMonths, gender]);

  const quickSet = (
    key: string,
    setH: (v: string) => void,
    setM: (v: string) => void,
    setP: (v: 'AM' | 'PM') => void
  ) => {
    const times = QUICK_TIMES[key];
    if (!times) return;
    return (
      <View style={styles.quickRow}>
        {times.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickChip}
            activeOpacity={0.7}
            onPress={() => { setH(t.h); setM(t.m); setP(t.p); }}
          >
            <Text style={styles.quickChipText}>{t.h}:{t.m} {t.p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const timeInput = (
    h: string, setH: (v: string) => void,
    m: string, setM: (v: string) => void,
    p: 'AM' | 'PM', setP: (v: 'AM' | 'PM') => void,
  ) => (
    <View style={styles.timeRow}>
      <View style={styles.timeInputWrap}>
        <TextInput
          value={h}
          onChangeText={(v) => setH(v.replace(/[^0-9]/g, '').slice(0, 2))}
          placeholder="12"
          keyboardType="number-pad"
          style={styles.timeInput}
          underlineColorAndroid="transparent"
          activeUnderlineColor="transparent"
          placeholderTextColor="#CBD5E1"
          maxLength={2}
          contentStyle={styles.timeInputContent}
        />
      </View>
      <Text style={styles.timeColon}>:</Text>
      <View style={styles.timeInputWrap}>
        <TextInput
          value={m}
          onChangeText={(v) => setM(v.replace(/[^0-9]/g, '').slice(0, 2))}
          placeholder="00"
          keyboardType="number-pad"
          style={styles.timeInput}
          underlineColorAndroid="transparent"
          activeUnderlineColor="transparent"
          placeholderTextColor="#CBD5E1"
          maxLength={2}
          contentStyle={styles.timeInputContent}
        />
      </View>
      <View style={styles.ampmRow}>
        {(['AM', 'PM'] as const).map((ap) => (
          <TouchableOpacity
            key={ap}
            style={[styles.ampmBtn, p === ap && styles.ampmBtnActive]}
            onPress={() => setP(ap)}
          >
            <Text style={[styles.ampmText, p === ap && styles.ampmTextActive]}>{ap}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const timeField = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    quickKey: string,
    h: string, setH: (v: string) => void,
    m: string, setM: (v: string) => void,
    p: 'AM' | 'PM', setP: (v: 'AM' | 'PM') => void,
    required = true,
  ) => (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon} size={18} color="#FF7F60" />
        <Text style={styles.fieldLabel}>{label}</Text>
        {required ? (
          <Text style={styles.required}>Required</Text>
        ) : (
          <Text style={styles.optional}>Optional</Text>
        )}
      </View>
      {quickSet(quickKey, setH, setM, setP)}
      {timeInput(h, setH, m, setM, p, setP)}
    </View>
  );

  const canProceed = () => {
    if (step === 0) {
      return bedH && bedM && wakeH && wakeM;
    }
    if (step === 1) {
      return bfH && bfM && luH && luM && snH && snM && diH && diM;
    }
    if (step === 2 && ageGroup === 'toddler') {
      return napH && napM && actH && actM && lrnH && lrnM;
    }
    // Step 2 (6+) or step 3 — can proceed without optional fields
    return true;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!child) return;
    setSaving(true);
    try {
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
      };
      await updateChildRoutine(child.id, routine);
      await loadChildren();

      // Schedule notifications from routine
      const updatedChild = { ...child, ...routine };
      await scheduleChildNotifications(updatedChild as Child);

      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  if (!child) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7F60" />
      </View>
    );
  }

  const isToddler = ageGroup === 'toddler';
  const currentStep = STEPS[step];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Routine</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
              <Ionicons
                name={i < step ? 'checkmark' : (s.icon as any)}
                size={16}
                color={i <= step ? '#FFF' : '#94A3B8'}
              />
            </View>
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{s.title}</Text>
            {i < 3 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      {/* Step content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Ionicons name={currentStep.icon as any} size={28} color="#FF7F60" />
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepSubtitle}>
            {step === 0 && `${child.name}'s sleep and wake schedule`}
            {step === 1 && `When does ${child.name} eat?`}
            {step === 2 && (isToddler
              ? `All activity times are required for ages 2-5`
              : `Nap, activity, and learn times are optional for ages 6+`)}
            {step === 3 && `Height and weight for BMI calculation`}
          </Text>
        </View>

        <View style={styles.formCard}>
          {step === 0 && (
            <>
              {timeField('Bedtime', 'moon-outline', 'bedtime', bedH, setBedH, bedM, setBedM, bedP, setBedP)}
              {timeField('Wake-up Time', 'sunny-outline', 'wake', wakeH, setWakeH, wakeM, setWakeM, wakeP, setWakeP)}
            </>
          )}

          {step === 1 && (
            <>
              {timeField('Breakfast', 'egg-outline', 'breakfast', bfH, setBfH, bfM, setBfM, bfP, setBfP)}
              {timeField('Lunch', 'restaurant-outline', 'lunch', luH, setLuH, luM, setLuM, luP, setLuP)}
              {timeField('Snack', 'nutrition-outline', 'snack', snH, setSnH, snM, setSnM, snP, setSnP)}
              {timeField('Dinner', 'fast-food-outline', 'dinner', diH, setDiH, diM, setDiM, diP, setDiP)}
            </>
          )}

          {step === 2 && (
            <>
              {timeField('Nap Time', 'bed-outline', 'nap', napH, setNapH, napM, setNapM, napP, setNapP, isToddler)}
              {timeField('Activity Time', 'fitness-outline', 'activity', actH, setActH, actM, setActM, actP, setActP, isToddler)}
              {timeField('Learning Time', 'book-outline', 'learn', lrnH, setLrnH, lrnM, setLrnM, lrnP, setLrnP, isToddler)}
            </>
          )}

          {step === 3 && (
            <>
              {/* Gender picker */}

              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="person-outline" size={18} color="#FF7F60" />
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <Text style={styles.required}>Required for BMI</Text>
                </View>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderChip, gender === 'male' && styles.genderChipActive]}
                    onPress={() => setGender('male')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="male" size={20} color={gender === 'male' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Boy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderChip, gender === 'female' && styles.genderChipActive]}
                    onPress={() => setGender('female')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="female" size={20} color={gender === 'female' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Girl</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="resize-outline" size={18} color="#FF7F60" />
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <Text style={styles.required}>Required</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={height}
                    onChangeText={(v) => setHeight(v.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 95.5"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    activeUnderlineColor="transparent"
                    placeholderTextColor="#94A3B8"
                    contentStyle={styles.inputContent}
                  />
                  <Text style={styles.unitLabel}>cm</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="barbell-outline" size={18} color="#FF7F60" />
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <Text style={styles.required}>Required</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={weight}
                    onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))}
                    placeholder="e.g. 14.2"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    activeUnderlineColor="transparent"
                    placeholderTextColor="#94A3B8"
                    contentStyle={styles.inputContent}
                  />
                  <Text style={styles.unitLabel}>kg</Text>
                </View>
              </View>

              {/* BMI Preview */}
              {bmiResult && (
                <View style={[styles.bmiCard, styles[`bmi${bmiResult.category}`]]}>
                  <View style={styles.bmiHeader}>
                    <Text style={styles.bmiTitle}>BMI Assessment</Text>
                    <Text style={styles.bmiValue}>{bmiResult.bmi}</Text>
                  </View>
                  <Text style={styles.bmiCategory}>{bmiResult.label}</Text>
                  <View style={styles.bmiRow}>
                    <Text style={styles.bmiDetail}>Percentile: {bmiResult.percentile}th</Text>
                    <Text style={styles.bmiDetail}>Z-score: {bmiResult.zScore}</Text>
                  </View>
                  <Text style={styles.bmiNote}>
                    Based on WHO growth standards for {isToddler ? '2-5 year olds' : 'children'}
                  </Text>
                </View>
              )}

              {height && weight && !bmiResult && !gender && (
                <View style={styles.bmiCard}>
                  <Text style={styles.bmiNote}>
                    Select gender above to calculate BMI percentile.
                  </Text>
                </View>
              )}

              {height && weight && !bmiResult && ageMonths < 24 && gender && (
                <View style={styles.bmiCard}>
                  <Text style={styles.bmiNote}>
                    WHO BMI percentiles available for ages 2-5. BMI will be calculated as raw value.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={18} color="#64748B" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step < 3 ? 'Next' : 'Save Routine'}
              </Text>
              <Ionicons name={step < 3 ? 'arrow-forward' : 'checkmark'} size={18} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#0F172A' },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { fontSize: 14, fontWeight: '500', color: '#94A3B8' },

  // Step indicator
  stepsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 16, gap: 0,
  },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: '#FF7F60' },
  stepLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  stepLabelActive: { color: '#FF7F60' },
  stepLine: {
    position: 'absolute', top: 18, left: '60%', right: '-60%',
    height: 2, backgroundColor: '#E2E8F0',
  },
  stepLineActive: { backgroundColor: '#FF7F60' },

  // Step content
  stepHeader: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  stepSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },

  formCard: {
    backgroundColor: '#FFFDFF', marginHorizontal: 24, borderRadius: 24,
    borderWidth: 1, borderColor: '#E2E8F0', padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  // Field
  fieldGroup: { marginBottom: 24 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1 },
  required: { fontSize: 11, fontWeight: '600', color: '#FF7F60', backgroundColor: '#FFF0ED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  optional: { fontSize: 11, fontWeight: '500', color: '#94A3B8', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  // Quick times
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'transparent',
  },
  quickChipText: { fontSize: 12, fontWeight: '500', color: '#64748B' },

  // Time input
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInputWrap: {
    width: 56, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FEFBF6',
    alignItems: 'center', justifyContent: 'center',
  },
  timeInput: { backgroundColor: 'transparent', fontSize: 18, height: 48, textAlign: 'center' },
  timeInputContent: { paddingHorizontal: 0, textAlign: 'center' },
  timeColon: { fontSize: 20, fontWeight: '600', color: '#0F172A', marginHorizontal: 2 },
  ampmRow: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  ampmBtn: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent',
  },
  ampmBtnActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  ampmText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  ampmTextActive: { color: '#FF7F60' },

  // Standard input
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEFBF6', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', paddingHorizontal: 16, height: 52,
  },
  input: { flex: 1, backgroundColor: 'transparent', fontSize: 16, height: 52, color: '#0F172A' },
  inputContent: { paddingHorizontal: 0 },
  unitLabel: { fontSize: 14, color: '#94A3B8', marginLeft: 8 },

  // Gender picker
  genderRow: { flexDirection: 'row', gap: 12 },
  genderChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#F1F5F9',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  genderChipActive: { backgroundColor: '#FF7F60', borderColor: '#FF7F60' },
  genderText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  genderTextActive: { color: '#FFF' },

  // BMI card
  bmiCard: {
    borderRadius: 16, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  bmiunderweight: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  bminormal: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  bmioverweight: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  bmiobese: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  bmiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bmiTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  bmiValue: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  bmiCategory: { fontSize: 13, fontWeight: '500', color: '#64748B', marginBottom: 8 },
  bmiRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  bmiDetail: { fontSize: 12, color: '#94A3B8' },
  bmiNote: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },

  // Bottom nav
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: '#FFFDFF', borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, height: 52, borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  nextButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16, backgroundColor: '#FF7F60',
    shadowColor: '#FF7F60', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  nextButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  nextButtonText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
} as any);
