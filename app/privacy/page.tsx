'use client';

/**
 * Privacy Policy Page
 * 
 * Comprehensive privacy policy for Attndee attendance tracking system
 */

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
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
              Attndee<span className="text-blue-600">.</span> Privacy
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-blue-600" size={40} />
            <h1 className="text-5xl font-bold text-black">Privacy Policy</h1>
          </div>
          <p className="text-gray-500 text-lg">Last updated: December 27, 2025</p>
        </div>

        {/* Content */}
        <div className="prose max-w-none">
          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to Attndee. We are committed to protecting your privacy and handling your data 
              in an open and transparent manner. This Privacy Policy explains how we collect, use, 
              store, and protect your personal information when you use our attendance tracking service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              By using Attndee, you agree to the collection and use of information in accordance with 
              this policy.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-black mb-3">2.1 Personal Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you use Attndee, we may collect the following personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Name and email address (for account creation and management)</li>
              <li>Student/Participant identification information</li>
              <li>Attendance timestamps and check-in records</li>
              <li>Class or session identifiers</li>
            </ul>

            <h3 className="text-xl font-semibold text-black mb-3">2.2 Location Data</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you enable location verification for a class:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>GPS coordinates are collected at the time of check-in</li>
              <li>Location data is used solely to verify physical presence</li>
              <li>Location collection is optional and configurable per class</li>
              <li>Users must explicitly grant location permissions</li>
            </ul>

            <h3 className="text-xl font-semibold text-black mb-3">2.3 Technical Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We automatically collect certain technical information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Device type and operating system</li>
              <li>Browser type and version</li>
              <li>IP address and general location (city/country level)</li>
              <li>QR code scan timestamps</li>
              <li>Session activity and usage patterns</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li><strong>Attendance Tracking:</strong> To record and verify student/participant attendance</li>
              <li><strong>Location Verification:</strong> To confirm physical presence when enabled</li>
              <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our service</li>
              <li><strong>Security:</strong> To prevent fraud and ensure the integrity of attendance records</li>
              <li><strong>Communication:</strong> To send important service updates and notifications</li>
              <li><strong>Reporting:</strong> To generate attendance reports and analytics for instructors</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Data is encrypted in transit using SSL/TLS protocols</li>
              <li>Attendance records are stored on secure servers with encryption at rest</li>
              <li>Access to personal data is restricted to authorized personnel only</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Rolling QR codes prevent screenshot-based attendance fraud</li>
            </ul>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6">
              <p className="text-blue-900">
                <strong>Data Retention:</strong> Attendance records are retained for the duration of the 
                academic term/session plus 24 months for record-keeping purposes, unless otherwise 
                required by law or institutional policy.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share 
              your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li><strong>Instructors/Administrators:</strong> Attendance data is shared with authorized class instructors</li>
              <li><strong>Educational Institutions:</strong> If using Attndee through your school/organization</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or legal process</li>
              <li><strong>Service Providers:</strong> With trusted third-party providers who assist in operating our service (under strict confidentiality agreements)</li>
              <li><strong>Export Requests:</strong> When you explicitly request to export your attendance data</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to retention requirements)</li>
              <li><strong>Export:</strong> Download your attendance records in CSV format</li>
              <li><strong>Location Control:</strong> Disable location tracking on a per-class basis</li>
              <li><strong>Opt-out:</strong> Unsubscribe from non-essential communications</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              To exercise these rights, please contact us at the details provided in Section 10.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">7. Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Attndee uses minimal cookies and tracking technologies:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li><strong>Essential Cookies:</strong> Required for authentication and session management</li>
              <li><strong>Analytics:</strong> Anonymous usage statistics to improve our service</li>
              <li><strong>Local Storage:</strong> For offline support and seamless user experience</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              You can control cookie preferences through your browser settings, though some features 
              may not function properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Attndee may be used by students of various ages. When used for minors under 13:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>Parental or guardian consent must be obtained by the educational institution</li>
              <li>We collect only the minimum necessary information for attendance tracking</li>
              <li>Additional protections are in place in accordance with COPPA (Children's Online Privacy Protection Act)</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. When we make changes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
              <li>The "Last updated" date will be revised</li>
              <li>Significant changes will be communicated via email or in-app notification</li>
              <li>Continued use of the service constitutes acceptance of the updated policy</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold text-black mb-4">10. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or your 
              personal data, please contact us:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <p className="text-gray-700 mb-2"><strong>Email:</strong> dataplus50@gmail.com</p>
              <p className="text-gray-700 mb-2"><strong>Support:</strong> dataplus50@gmail.com</p>
              <p className="text-gray-700"><strong>Response Time:</strong> We aim to respond within 48 hours. Please kindly add title [Attndee] in your email title for any inquiry</p>
            </div>
          </section>

          <div className="bg-gray-100 border-l-4 border-gray-600 p-6 my-8">
            <p className="text-gray-800 font-medium">
              This Privacy Policy is effective as of December 27, 2025, and governs the privacy of 
              all users of the Attndee attendance tracking service.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between items-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
          <Link
            href="/terms"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Terms of Service →
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
