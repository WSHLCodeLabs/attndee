'use client';

/**
 * Landing Page - Attndee
 * 
 * Purpose: Clean landing page with branding and single CTA
 * Action: Redirect to /create for room creation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';

export default function LandingPage() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleCreateClass = () => {
    setIsNavigating(true);
    router.push('/create');
  };

  if (isNavigating) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      {/* Logo/Branding */}
      <div className="mb-12 text-center">
        <h1 className="text-8xl md:text-9xl font-bold tracking-tight text-black mb-2">
          Attndee<span className="text-blue-600">.</span>
        </h1>
        <p className="text-lg text-gray-500 font-light mt-4">
          Instant Rolling QR Attendance
        </p>
      </div>

      {/* Primary CTA */}
      <button
        onClick={handleCreateClass}
        className="px-12 py-5 bg-black text-white text-lg font-medium rounded-full
                   hover:bg-gray-800 active:bg-gray-900 transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-gray-300"
      >
        Create Class
      </button>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-gray-400 font-light">
          © {new Date().getFullYear()} Attndee. All rights reserved.
        </p>
      </div>
    </div>
  );
}
