import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { useApp } from '../../stores/auth';
import { getRecommendations, analyzeChild, Recommendation } from '../../lib/api';

export default function AIScreen() {
  const { selectedChild } = useApp();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (selectedChild) {
      setLoading(true);
      getRecommendations(selectedChild.id)
        .then(setRecommendations)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedChild]);

  const handleAnalyze = async () => {
    if (!selectedChild) return;
    setAnalyzing(true);
    try {
      const result = await analyzeChild(selectedChild.id);
      if (result.recommendations) {
        setRecommendations(result.recommendations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!selectedChild) {
    return (
      <View style={styles.empty}>
        <Text variant="headlineSmall">Select a child first</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall">AI Insights</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.6 }}>for {selectedChild.name}</Text>
      </View>

      <Button
        mode="contained"
        onPress={handleAnalyze}
        loading={analyzing}
        icon="psychology"
        style={{ marginBottom: 16 }}
      >
        {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
      </Button>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 32 }} />
      ) : recommendations.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="bodyLarge" style={{ textAlign: 'center', opacity: 0.6 }}>
              No recommendations yet. Log more activities and run AI analysis.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        recommendations.map((rec, i) => (
          <Card key={rec.id || i} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium">{rec.category || 'General'}</Text>
                <Text style={[styles.priority, { color: rec.priority === 'high' ? '#EF4444' : rec.priority === 'medium' ? '#F59E0B' : '#10B981' }]}>
                  {rec.priority?.toUpperCase()}
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ marginTop: 8 }}>{rec.content}</Text>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priority: { fontWeight: 'bold', fontSize: 12 },
  emptyCard: { marginTop: 32 },
});
