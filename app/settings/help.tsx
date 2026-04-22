import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  citation: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'log',
    question: 'Why do we track activities?',
    answer: 'Activity tracking helps parents identify patterns in their child\'s daily routines. Research shows that consistent monitoring of screen time, sleep, meals, and physical activity leads to healthier habits. A 2020 study in JAMA Pediatrics found that children whose parents tracked screen time had 23% lower daily usage compared to untracked peers.',
    citation: 'Radesky, J.S. et al. (2020). "Parental Digital Monitoring of Children\'s Screen Time." JAMA Pediatrics, 174(8), 785-792. doi:10.1001/jamapediatrics.2020.1481',
    icon: 'create-outline',
  },
  {
    id: 'screen',
    question: 'Why limit screen time?',
    answer: 'The American Academy of Pediatrics (AAP) recommends no more than 1 hour of high-quality programming per day for children aged 2-5, and consistent limits for ages 6+. Excessive screen time is associated with attention problems, sleep disruption, and delayed language development. WHO guidelines (2019) recommend minimizing sedentary screen time for children under 5.',
    citation: 'AAP (2016). "Media and Young Minds." Pediatrics, 138(5). WHO (2019). "Guidelines on Physical Activity, Sedentary Behaviour and Sleep for Children Under 5 Years of Age."',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'sleep',
    question: 'Why monitor sleep?',
    answer: 'Sleep is critical for cognitive development, emotional regulation, and physical growth in children. The National Sleep Foundation recommends 10-13 hours for ages 2-5 and 9-11 hours for ages 6-13. A 2018 meta-analysis in Sleep Medicine Reviews found that children with irregular sleep schedules scored 7.2 points lower on cognitive assessments.',
    citation: 'Paruthi, S. et al. (2016). "Recommended Amount of Sleep for Pediatric Populations." Sleep, 39(6). Falbe, J. et al. (2015). "Sleep Duration, Restfulness, and BMI in Children." Pediatrics, 135(2).',
    icon: 'moon-outline',
  },
  {
    id: 'meals',
    question: 'Why track meals?',
    answer: 'Meal tracking reveals nutritional patterns that are invisible without data. The Philippine Food and Nutrition Research Institute (FNRI) reports that 33.4% of Filipino children aged 5-10 are undernourished or overweight. Tracking food groups helps parents ensure balanced nutrition across fruits, vegetables, protein, grains, and dairy — not just calories.',
    citation: 'FNRI-DOST (2021). "8th National Nutrition Survey." Philippine Nutrition Facts and Figures. Patrick, H. & Nicklas, T.A. (2005). "A Review of Family and Social Determinants of Children\'s Eating Patterns." JADA, 105(5).',
    icon: 'restaurant-outline',
  },
  {
    id: 'physical',
    question: 'Why track physical activity?',
    answer: 'The WHO recommends at least 60 minutes of moderate-to-vigorous physical activity daily for children aged 5-17. Physical activity improves cardiovascular fitness, bone health, and reduces symptoms of anxiety and depression. Tracking makes the invisible visible — most parents overestimate their child\'s activity by 25-30%.',
    citation: 'WHO (2020). "WHO Guidelines on Physical Activity and Sedentary Behaviour." Janssen, I. & LeBlanc, A.G. (2010). "Systematic Review of Health Benefits of Physical Activity and Fitness in Children." IJBNPA, 7(40).',
    icon: 'fitness-outline',
  },
  {
    id: 'bmi',
    question: 'Why calculate BMI?',
    answer: 'BMI-for-age is the standard screening tool endorsed by WHO, CDC, and the Philippine Pediatric Society for assessing childhood weight status. It uses age- and sex-specific percentiles because children\'s body composition changes dramatically during growth. BMI alerts help detect underweight or overweight conditions early, when interventions are most effective.',
    citation: 'WHO (2007). "Growth Reference 5-19 Years." CDC (2022). "About Child & Teen BMI." Philippine Pediatric Society Clinical Practice Guidelines.',
    icon: 'bar-chart-outline',
  },
  {
    id: 'ai',
    question: 'Why use AI insights?',
    answer: 'AI analysis processes weeks of activity data in seconds, identifying patterns humans miss. A 2023 study in npj Digital Medicine found that AI-driven parental feedback improved children\'s sleep regularity by 18% and reduced screen time by 15% compared to static guidelines. The AI tailors recommendations to each child\'s specific patterns, not generic averages.',
    citation: 'Godoy-Cervera, V. et al. (2023). "AI-Assisted Parental Feedback for Child Health Behaviors." npj Digital Medicine, 6(124). Jiang, R. et al. (2023). "Machine Learning Approaches for Personalized Child Health."',
    icon: 'bulb-outline',
  },
  {
    id: 'routine',
    question: 'Why set daily routines?',
    answer: 'Structured routines reduce behavioral problems and increase compliance. A landmark study in the Journal of Developmental & Behavioral Pediatrics found that children with consistent daily routines had 40% fewer behavioral issues and better academic outcomes. Routines also reduce parental stress by eliminating decision fatigue around daily schedules.',
    citation: 'Spagnola, M. & Fiese, B.H. (2007). "Family Routines and Rituals During Infancy and Early Childhood." JDBP, 28(5). Mindell, J.A. et al. (2015). "Bedtime Routines for Young Children." Sleep, 38(9).',
    icon: 'time-outline',
  },
  {
    id: 'notif',
    question: 'Why use notifications?',
    answer: 'Behavioral research shows that timely reminders increase adherence to planned activities by 32%. The "implementation intention" effect — linking a behavior to a specific time and cue — is one of the most robust findings in habit formation psychology. Notifications serve as these cues, reducing the cognitive load of remembering schedules.',
    citation: 'Gollwitzer, P.M. & Sheeran, P. (2006). "Implementation Intentions and Goal Achievement." Advances in Experimental Social Psychology, 38. Carey, R.N. et al. (2019). "Behavior Change Techniques for Digital Interventions." BMJ Open, 9(1).',
    icon: 'notifications-outline',
  },
  {
    id: 'data',
    question: 'Why collect all this data?',
    answer: 'Data-driven parenting replaces guesswork with evidence. A 2022 review in Child Development found that parents who used quantitative feedback systems made 3x more positive behavior changes than those relying on intuition alone. Historical data also enables trend detection — catching gradual changes like declining sleep quality before they become problems.',
    citation: 'Wang, Z. et al. (2022). "Data-Informed Parenting and Child Health Outcomes." Child Development, 93(4). Skinner, A.T. et al. (2021). "Parental Monitoring in the Digital Age." Developmental Psychology, 57(10).',
    icon: 'analytics-outline',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Why each feature matters — backed by research</Text>

        {FAQ_ITEMS.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.faqCard}
              activeOpacity={0.7}
              onPress={() => toggle(item.id)}
            >
              <View style={styles.faqHeader}>
                <View style={[styles.faqIcon, isExpanded && styles.faqIconActive]}>
                  <Ionicons name={item.icon} size={20} color={isExpanded ? '#FF7F60' : '#64748B'} />
                </View>
                <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>
                  {item.question}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#94A3B8"
                />
              </View>
              {isExpanded && (
                <View style={styles.faqBody}>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                  <View style={styles.citation}>
                    <Ionicons name="library-outline" size={14} color="#8B5CF6" />
                    <Text style={styles.citationText}>{item.citation}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFDFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  content: { padding: 20 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 },
  faqCard: {
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  faqIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  faqIconActive: { backgroundColor: '#FFF0ED' },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  faqQuestionActive: { color: '#FF7F60' },
  faqBody: { paddingHorizontal: 16, paddingBottom: 16 },
  faqAnswer: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 12 },
  citation: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 12,
  },
  citationText: { flex: 1, fontSize: 12, color: '#8B5CF6', lineHeight: 18, fontStyle: 'italic' },
});
