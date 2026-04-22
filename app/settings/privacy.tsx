import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={48} color="#10B981" />
        </View>

        <Text style={styles.title}>Your Data is Protected</Text>

        <Text style={styles.body}>
          Smart Parenting App is committed to safeguarding the privacy and security of your family's personal data. This application complies with the following Philippine data privacy laws and regulations:
        </Text>

        <View style={styles.section}>
          <View style={styles.sectionIcon}>
            <Ionicons name="document-text-outline" size={20} color="#FF7F60" />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Republic Act No. 10173</Text>
            <Text style={styles.sectionSubtitle}>Data Privacy Act of 2012</Text>
            <Text style={styles.sectionBody}>
              This law protects individuals against unauthorized processing of personal data. Smart Parenting App ensures all data collection, storage, and processing adheres to the principles of transparency, legitimate purpose, and proportionality as mandated by RA 10173.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionIcon}>
            <Ionicons name="people-outline" size={20} color="#FF7F60" />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Special Protection for Children's Data</Text>
            <Text style={styles.sectionBody}>
              As children's data falls under the category of sensitive personal information under RA 10173 (Section 3[L]), Smart Parenting App implements enhanced protections. Data about minors is treated with the highest level of care and is only accessible to the parent or legal guardian who created the account.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionIcon}>
            <Ionicons name="lock-closed-outline" size={20} color="#FF7F60" />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Secure-by-Design Principles</Text>
            <Text style={styles.sectionBody}>
              Built on the Mobile Development Lifecycle (MDLC), Smart Parenting App follows secure-by-design principles throughout its architecture:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• End-to-end encrypted data transmission</Text>
              <Text style={styles.bullet}>• Row-Level Security (RLS) on all database operations</Text>
              <Text style={styles.bullet}>• Authentication via Supabase Auth with JWT tokens</Text>
              <Text style={styles.bullet}>• No third-party data sharing or advertising</Text>
              <Text style={styles.bullet}>• Local-first data processing where possible</Text>
              <Text style={styles.bullet}>• Regular security audits and penetration testing</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionIcon}>
            <Ionicons name="trash-outline" size={20} color="#FF7F60" />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Your Rights</Text>
            <Text style={styles.sectionBody}>
              Under RA 10173, you have the right to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Be informed about data collection and processing</Text>
              <Text style={styles.bullet}>• Access your personal data</Text>
              <Text style={styles.bullet}>• Correct inaccurate data</Text>
              <Text style={styles.bullet}>• Erase or block your data</Text>
              <Text style={styles.bullet}>• Data portability</Text>
              <Text style={styles.bullet}>• Object to data processing</Text>
              <Text style={styles.bullet}>• File a complaint with the NPC</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: April 2026</Text>
          <Text style={styles.footerText}>Version 1.0</Text>
        </View>

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
  iconWrap: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 20 },
  section: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionContent: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  sectionBody: { fontSize: 14, color: '#475569', lineHeight: 21 },
  bulletList: { marginTop: 8 },
  bullet: { fontSize: 14, color: '#475569', lineHeight: 22 },
  footer: { alignItems: 'center', marginTop: 16, gap: 4 },
  footerText: { fontSize: 12, color: '#94A3B8' },
});
