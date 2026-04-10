import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../stores/auth';
import { logActivity, ActivityType } from '../../lib/api';

export default function LogActivityScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [activityType, setActivityType] = useState<ActivityType>((type as ActivityType) || 'screen_time');
  const { selectedChild } = useApp();
  const router = useRouter();
  const theme = useTheme();

  // Screen time
  const [screenMinutes, setScreenMinutes] = useState('');
  const [deviceType, setDeviceType] = useState('phone');

  // Sleep
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('good');

  // Meal
  const [mealType, setMealType] = useState('breakfast');
  const [mealQuality, setMealQuality] = useState('good');

  // Education
  const [eduMinutes, setEduMinutes] = useState('');
  const [eduActivity, setEduActivity] = useState('reading');

  const handleLog = async () => {
    if (!selectedChild) {
      Alert.alert('Error', 'No child selected');
      return;
    }

    let value: Record<string, any> = {};
    switch (activityType) {
      case 'screen_time':
        value = { minutes: parseInt(screenMinutes) || 0, device: deviceType };
        break;
      case 'sleep':
        value = { hours: parseFloat(sleepHours) || 0, quality: sleepQuality };
        break;
      case 'meal':
        value = { meal_type: mealType, quality: mealQuality };
        break;
      case 'education':
        value = { minutes: parseInt(eduMinutes) || 0, activity: eduActivity };
        break;
    }

    try {
      await logActivity(selectedChild.id, activityType, value);
      Alert.alert('Logged', 'Activity recorded successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>Log Activity</Text>
      <Text variant="bodyMedium" style={styles.child}>{selectedChild?.name}</Text>

      <SegmentedButtons
        value={activityType}
        onValueChange={(v) => setActivityType(v as ActivityType)}
        buttons={[
          { value: 'screen_time', label: 'Screen' },
          { value: 'sleep', label: 'Sleep' },
          { value: 'meal', label: 'Meal' },
          { value: 'education', label: 'Edu' },
        ]}
        style={styles.segment}
      />

      {activityType === 'screen_time' && (
        <View style={styles.fields}>
          <TextInput label="Minutes of screen time" value={screenMinutes} onChangeText={setScreenMinutes} keyboardType="numeric" />
          <SegmentedButtons value={deviceType} onValueChange={setDeviceType}
            buttons={[
              { value: 'phone', label: 'Phone' },
              { value: 'tablet', label: 'Tablet' },
              { value: 'tv', label: 'TV' },
              { value: 'computer', label: 'PC' },
            ]} />
        </View>
      )}

      {activityType === 'sleep' && (
        <View style={styles.fields}>
          <TextInput label="Hours of sleep" value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" />
          <SegmentedButtons value={sleepQuality} onValueChange={setSleepQuality}
            buttons={[
              { value: 'poor', label: 'Poor' },
              { value: 'fair', label: 'Fair' },
              { value: 'good', label: 'Good' },
            ]} />
        </View>
      )}

      {activityType === 'meal' && (
        <View style={styles.fields}>
          <SegmentedButtons value={mealType} onValueChange={setMealType}
            buttons={[
              { value: 'breakfast', label: 'Breakfast' },
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' },
            ]} />
          <SegmentedButtons value={mealQuality} onValueChange={setMealQuality}
            buttons={[
              { value: 'poor', label: 'Poor' },
              { value: 'fair', label: 'Fair' },
              { value: 'good', label: 'Good' },
            ]} />
        </View>
      )}

      {activityType === 'education' && (
        <View style={styles.fields}>
          <TextInput label="Minutes of activity" value={eduMinutes} onChangeText={setEduMinutes} keyboardType="numeric" />
          <SegmentedButtons value={eduActivity} onValueChange={setEduActivity}
            buttons={[
              { value: 'reading', label: 'Reading' },
              { value: 'homework', label: 'Homework' },
              { value: 'learning_app', label: 'App' },
            ]} />
        </View>
      )}

      <Button mode="contained" onPress={handleLog} style={styles.submit}>
        Log Activity
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 4 },
  child: { opacity: 0.6, marginBottom: 16 },
  segment: { marginBottom: 16 },
  fields: { gap: 12, marginBottom: 16 },
  submit: { marginTop: 8 },
});
