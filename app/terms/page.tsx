'use client';

/**
 * Terms of Service Page
 * 
 * Comprehensive terms of service for Attndee attendance tracking system
 */

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-2xl font-bold text-black">
              Attndee<span className="text-blue-600">.</span> Terms
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-blue-600" size={40} />
            <h1 className="text-5xl font-bold text-black">Terms of Service</h1>
          </div>
          <p className="text-gray-500 text-lg">Last updated: December 27, 2025</p>
        </div>

        {/* Content */}
        <div className="prose max-w-none">
          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to Attndee. By accessing or using our attendance tracking service, you agree to 
              be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please 
              do not use our service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              These Terms apply to all users, including instructors, students, administrators, and 
              visitors to the Attndee platform.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Attndee is an instant attendance tracking platform that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Rolling QR code generation for secure attendance verification</li>
              <li>Optional GPS-based location verification</li>
              <li>Real-time attendance tracking and reporting</li>
              <li>Data export capabilities (CSV format)</li>
              <li>Class/session management tools</li>
              <li>Offline support with automatic synchronization</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any aspect of the service at 
              any time with or without notice.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">3. User Accounts and Registration</h2>
            
            <h3 className="text-xl font-semibold text-black mb-3">3.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              To use certain features of Attndee, you may be required to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h3 className="text-xl font-semibold text-black mb-3">3.2 Account Eligibility</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You must be at least 13 years old to create an account. Users under 18 should have 
              parental or guardian consent. Institutional users must have proper authorization from 
              their educational organization.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">4. Acceptable Use Policy</h2>
            
            <h3 className="text-xl font-semibold text-black mb-3">4.1 Permitted Use</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree to use Attndee only for lawful purposes and in accordance with these Terms. 
              You may use the service to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Track attendance for legitimate educational or organizational purposes</li>
              <li>Generate and display QR codes for check-in</li>
              <li>Export and analyze attendance data</li>
              <li>Manage classes and sessions</li>
            </ul>

            <h3 className="text-xl font-semibold text-black mb-3">4.2 Prohibited Activities</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Attempt to circumvent QR code security measures or location verification</li>
              <li>Share screenshots of QR codes to enable fraudulent check-ins</li>
              <li>Use automated tools or bots to manipulate attendance records</li>
              <li>Access or attempt to access other users' accounts without authorization</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Use the service to violate any laws or regulations</li>
              <li>Falsify attendance records or data</li>
              <li>Reverse engineer, decompile, or disassemble any part of the service</li>
              <li>Use the service for any commercial purpose without authorization</li>
            </ul>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-6">
              <p className="text-yellow-900">
                <strong>Warning:</strong> Violation of the Acceptable Use Policy may result in 
                immediate account suspension or termination, and may be reported to relevant 
                educational or legal authorities.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">5. Attendance Data and Accuracy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              While we strive to provide reliable attendance tracking:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Users are responsible for verifying the accuracy of attendance records</li>
              <li>Instructors should implement additional verification methods if required</li>
              <li>Technical issues may occasionally affect data collection or synchronization</li>
              <li>Location data is approximate and subject to GPS accuracy limitations</li>
              <li>Final attendance decisions remain the responsibility of instructors/administrators</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">6. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-black mb-3">6.1 Our Property</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              All content, features, and functionality of Attndee, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Software, code, and algorithms</li>
              <li>Design, graphics, and user interface</li>
              <li>The Attndee name, logo, and branding</li>
              <li>Rolling QR code technology and implementation</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              are owned by Attndee and are protected by copyright, trademark, and other intellectual 
              property laws.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3">6.2 Your Data</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You retain all rights to your attendance data. By using Attndee, you grant us a limited 
              license to process, store, and display your data solely for the purpose of providing 
              the service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">7. Privacy and Data Protection</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your privacy is important to us. Our collection and use of personal information is 
              governed by our Privacy Policy. By using Attndee, you consent to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Collection of attendance data and timestamps</li>
              <li>Optional collection of location data when enabled</li>
              <li>Processing and storage of your personal information as described in our Privacy Policy</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Please review our <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link> for 
              detailed information.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">8. Service Availability and Modifications</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We strive to provide continuous service availability, but:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>The service may be temporarily unavailable due to maintenance or technical issues</li>
              <li>We may modify features or functionality with or without notice</li>
              <li>We do not guarantee 100% uptime or error-free operation</li>
              <li>Offline functionality may have limitations</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              We recommend maintaining backup attendance records for critical sessions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Attndee is provided "AS IS" and "AS AVAILABLE" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
              <li>We are not responsible for data loss, though we implement reasonable backup measures</li>
              <li>Our total liability shall not exceed the amount paid by you (if any) in the past 12 months</li>
              <li>We are not liable for decisions made based solely on attendance data</li>
            </ul>
            <div className="bg-gray-50 border border-gray-300 rounded-xl p-6 my-6">
              <p className="text-gray-700">
                Some jurisdictions do not allow the exclusion of certain warranties or limitation of 
                liability. In such jurisdictions, liability will be limited to the greatest extent 
                permitted by law.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">10. Termination</h2>
            
            <h3 className="text-xl font-semibold text-black mb-3">10.1 By You</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may stop using the service and close your account at any time. Upon closure, you 
              should export any data you wish to retain.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3">10.2 By Us</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to suspend or terminate your account if:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>You violate these Terms or our Acceptable Use Policy</li>
              <li>You engage in fraudulent or illegal activities</li>
              <li>Your account has been inactive for an extended period</li>
              <li>Required by law or legal process</li>
            </ul>

            <h3 className="text-xl font-semibold text-black mb-3">10.3 Effect of Termination</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Upon termination, your right to use the service ceases immediately. We may retain 
              certain data as required by law or for legitimate business purposes.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">11. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree to indemnify and hold harmless Attndee, its affiliates, and their respective 
              officers, directors, employees, and agents from any claims, damages, losses, or expenses 
              arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Your use or misuse of the service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Fraudulent attendance records or data manipulation</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to modify these Terms at any time. When we make changes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>The "Last updated" date will be revised</li>
              <li>Material changes will be communicated via email or in-app notification</li>
              <li>Continued use after changes constitutes acceptance of the new Terms</li>
              <li>If you disagree with changes, you should discontinue use</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">13. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with applicable laws. 
              Any disputes shall be resolved through:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Good faith negotiation between the parties</li>
              <li>Mediation, if negotiation fails</li>
              <li>Binding arbitration or court proceedings as a last resort</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">14. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <p className="text-gray-700 mb-2"><strong>Email:</strong> legal@attndee.com</p>
              <p className="text-gray-700 mb-2"><strong>Support:</strong> support@attndee.com</p>
              <p className="text-gray-700"><strong>Response Time:</strong> We aim to respond within 48 hours</p>
            </div>
          </section>

          <div className="bg-gray-100 border-l-4 border-gray-600 p-6 my-8">
            <p className="text-gray-800 font-medium mb-4">
              By using Attndee, you acknowledge that you have read, understood, and agree to be bound 
              by these Terms of Service.
            </p>
            <p className="text-gray-700 text-sm">
              These Terms of Service are effective as of December 27, 2025.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between items-center">
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← View Privacy Policy
          </Link>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Home →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Attndee. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
