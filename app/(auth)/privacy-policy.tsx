import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoGradient}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        </View>
        <Text style={styles.brandName}>Smart Parenting</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: April 2026</Text>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly, including your name, email address, and
            any child profiles you add. This includes activity logs such as screen time, sleep records,
            meals, and educational activities.
          </Text>
          <Text style={styles.paragraph}>
            When you use the app, we also automatically collect device information such as your
            operating system, device identifiers, and usage data to improve our services.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use collected information to provide, maintain, and improve the Smart Parenting app,
            including tracking your child's growth activities, generating AI-powered insights, and
            sending scheduled notifications as configured by you.
          </Text>
          <Text style={styles.paragraph}>
            We do not sell, trade, or rent your personal information or your child's data to third
            parties for marketing purposes.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>3. Data Storage and Security</Text>
          <Text style={styles.paragraph}>
            All data is stored securely using Supabase infrastructure. Your data is protected by
            role-based access controls and Row Level Security (RLS) policies enforced at the database
            layer. Only authenticated users can access their own data.
          </Text>
          <Text style={styles.paragraph}>
            Authentication tokens are stored using Expo's secure AsyncStorage with encryption.
            You are responsible for keeping your login credentials confidential.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>4. AI Insights and Automated Decisions</Text>
          <Text style={styles.paragraph}>
            AI-powered recommendations are generated server-side using aggregated, anonymized
            activity data. These insights are advisory only and do not make automated decisions
            with legal or significant effects on your child.
          </Text>
          <Text style={styles.paragraph}>
            AI prompts and responses are not stored beyond the generation cycle and are not shared
            with third-party AI providers.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>5. Your Rights</Text>
          <Text style={styles.paragraph}>
            Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to
            access, correct, update, or delete your personal data. You may exercise these rights
            by contacting us or using the account deletion feature within the app.
          </Text>
          <Text style={styles.paragraph}>
            You may also request deletion of your account and all associated child profiles and
            activity data. Deletion is permanent and cannot be undone.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal data for as long as your account is active or as needed to
            provide services. Upon account deletion, all personal data, child profiles, and activity
            logs are permanently removed from our systems within 30 days.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Smart Parenting is designed for parents and guardians managing child activity data.
            We do not knowingly collect personal information from children under 13. All child
            profile data is managed by the parent or guardian account holder.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>8. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy periodically. Any material changes will be communicated
            via the app and will take effect upon the next login. Continued use of the app after
            changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        {/* Section 9 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>9. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions or concerns about this Privacy Policy or our data practices,
            please contact the Smart Parenting team through the app's support channel.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Back Button */}
      <View style={styles.footer}>
        <View
          style={styles.backButton}
          onTouchEnd={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color="#FF7F60" />
          <Text style={styles.backText}>Go Back</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logoGradient: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FF7F60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 20,
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 8,
  },
  spacer: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    borderWidth: 1,
    borderColor: '#FED7CC',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7F60',
  },
});
