import { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useApp } from '../../stores/auth';
import { getActivities, getActivitySummary } from '../../lib/api';

export default function DashboardScreen() {
  const { selectedChild, children, loadChildren } = useApp();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    loadChildren();
  }, []);

  if (!selectedChild) {
    return (
      <View style={styles.empty}>
        <Text variant="headlineSmall">No children added yet</Text>
        <Button mode="contained" onPress={() => router.push('/child/new')} style={{ marginTop: 16 }}>
          Add Child Profile
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium">{selectedChild.name}</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
          {selectedChild.date_of_birth ? `Born: ${selectedChild.date_of_birth}` : 'No DOB set'}
        </Text>
      </View>

      <View style={styles.cards}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Screen Time</Text>
            <Text variant="headlineMedium" style={{ color: '#2563EB' }}>--</Text>
            <Text variant="bodySmall">hours today</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => router.push('/log?type=screen_time')}>Log</Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Sleep</Text>
            <Text variant="headlineMedium" style={{ color: '#10B981' }}>--</Text>
            <Text variant="bodySmall">hours last night</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => router.push('/log?type=sleep')}>Log</Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Meals</Text>
            <Text variant="headlineMedium" style={{ color: '#F59E0B' }}>--</Text>
            <Text variant="bodySmall">logged today</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => router.push('/log?type=meal')}>Log</Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Education</Text>
            <Text variant="headlineMedium" style={{ color: '#8B5CF6' }}>--</Text>
            <Text variant="bodySmall">activities today</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => router.push('/log?type=education')}>Log</Button>
          </Card.Actions>
        </Card>
      </View>

      <Card style={{ margin: 16 }}>
        <Card.Content>
          <Text variant="titleMedium">AI Recommendations</Text>
          <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.6 }}>
            Log more activities to get personalized recommendations
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => router.push('/ai')}>View AI Insights</Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { padding: 16, paddingTop: 24 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  card: { flex: 1, minWidth: 150 },
});
