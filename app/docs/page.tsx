'use client';

/**
 * Documentation & FAQ Main Landing Page
 * 
 * Comprehensive FAQ and knowledge base reflecting the real Attndee system:
 * - myKU (.xlsx) native parser & auto-extraction
 * - Numeric 1/0 Excel SUM ready export
 * - 30s TOTP Rolling QR code with grace window
 * - Post-session absent summary & manual override
 * - Attndee. Pass™ 7-day cooldown & device fingerprinting
 */

import { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Home,
  ArrowLeft,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  UserCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  badge: string;
}

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('myku-import');

  const faqs: FAQItem[] = [
    {
      id: 'myku-import',
      category: 'import-export',
      badge: 'myKU Integration',
      question: 'การนำเข้าไฟล์รายชื่อนิสิตจากระบบ myKU (.xlsx) ทำงานอย่างไร?',
      answer:
        'ผู้สอนสามารถลากและวาง (Drag & Drop) ไฟล์รายงานรายชื่อนิสิตจากระบบ myKU (.xlsx) ลงในหน้าสร้างห้องเรียนได้ทันทีโดยไม่ต้องเสียเวลาจัดรูปแบบหรือลบหัวกระดาษทิ้ง ระบบ Attndee มาพร้อมตัวถอดรหัส myKU อัตโนมัติที่จะตรวจจับรหัสวิชา, ชื่อวิชา, หมู่เรียน (Section), และสกัดรายชื่อพร้อมรหัสนิสิต 10 หลักได้อย่างแม่นยำ 100% พร้อมแสดงตัวอย่างรายชื่อให้ตรวจสอบทันทีก่อนเริ่มคาบเรียน',
    },
    {
      id: 'attendance-export-sum',
      category: 'import-export',
      badge: 'Excel SUM Ready',
      question: 'การส่งออกคะแนนเช็คชื่อเป็นตัวเลข 1 และ 0 (Excel SUM Ready) ใช้งานอย่างไร?',
      answer:
        'เมื่อจบคาบเรียนและกดส่งออก (Export) ระบบจะสร้างไฟล์ .xlsx ที่คงรูปแบบโครงสร้างตารางเดิมของ myKU ไว้อย่างสมบูรณ์ พร้อมเติมผลการเช็คชื่อในคอลัมน์ของวันนั้นเป็นตัวเลข 1 (มาเรียน) และ 0 (ขาดเรียน) ทำให้อาจารย์สามารถใช้สูตร Excel พื้นฐานอย่าง =SUM() ลากคำนวณคะแนนรวมหรือชั่วโมงการเข้าเรียนของนิสิตได้ทันทีโดยไม่ต้องเสียเวลา Replace ตัวอักษรหรือแปลงสูตรใดๆ',
    },
    {
      id: 'rolling-qr-totp',
      category: 'security',
      badge: 'TOTP 30s + Grace',
      question: 'ระบบ Rolling QR Code (TOTP 30 วินาที + Grace Window) ป้องกันการทุจริตอย่างไร?',
      answer:
        'QR Code บนหน้าจออาจารย์จะเปลี่ยนรหัสลับชุดใหม่ทุก 30 วินาทีตามมาตรฐาน TOTP (Time-based One-Time Password) ทำให้นิสิตไม่สามารถถ่ายรูปหรือแคปเจอร์หน้าจอส่งต่อให้เพื่อนที่ไม่ได้เข้าเรียนสแกนได้ นอกจากนี้ระบบยังมีกลไก Grace Window อัจฉริยะ (±1 time step) เพื่อรองรับความหน่วงของสัญญาณอินเทอร์เน็ตและความล่าช้าขณะอุปกรณ์ของนิสิตกำลังจับพิกัด GPS ทำให้การเช็คชื่อไม่สะดุดแม้สัญญาณมือถือจะแกว่ง',
    },
    {
      id: 'post-session-override',
      category: 'attendance',
      badge: 'Post-Session',
      question: 'การสรุปยอดคนขาดและการเช็คชื่อย้อนหลัง (Manual Override) ทำอย่างไร?',
      answer:
        'เมื่อหมดเวลาเช็คชื่อและอาจารย์กด "ปิดรับการสแกน" (End Session) ระบบจะนำเข้าสู่หน้า Post-Session Summary ทันที เพื่อสรุปรายชื่อนิสิตที่ขาดเรียนทั้งหมด อาจารย์สามารถตรวจสอบเหตุผล (เช่น ลืมโทรศัพท์, แบตหมด, หรือมีใบลา) และสามารถกด "เช็คชื่อย้อนหลัง" (Manual Override) รายบุคคล หรือกดพิมพ์เพิ่มรายชื่อด้วยตนเองได้ทันทีก่อนกดยืนยัน Export ข้อมูล',
    },
    {
      id: 'pass-cooldown-fingerprint',
      category: 'security',
      badge: 'Attndee. Pass™',
      question: 'ระบบป้องกันการฝากเช็คชื่อ (7-Day Cooldown & Device Fingerprinting) คืออะไร?',
      answer:
        'Attndee ป้องกันการทุจริตการฝากเช็คชื่อผ่านระบบ Attndee. Pass™ 2 ชั้น: (1) 7-Day Cooldown เมื่อนิสิตผูกรหัสนิสิตเข้ากับอุปกรณ์แล้ว จะไม่สามารถเปลี่ยนรหัสไปมาเพื่อเช็คชื่อให้เพื่อนได้เป็นเวลา 7 วัน และ (2) Hardware & Canvas Device Fingerprinting ที่จดจำเอกลักษณ์ของฮาร์ดแวร์ประจำเครื่อง ทำให้แม้จะเปิดโหมดไม่ระบุตัวตน (Incognito/Private Browsing) หรือสลับไปใช้เบราว์เซอร์อื่นบนเครื่องเดียวกัน ระบบก็จะตรวจพบและบล็อกการเช็คชื่อซ้ำทันที',
    },
    {
      id: 'location-geofencing',
      category: 'security',
      badge: 'GPS Geofencing',
      question: 'การตรวจสอบตำแหน่งพิกัด (GPS Geolocation) ทำงานอย่างไรในห้องเรียน?',
      answer:
        'ผู้สอนสามารถเลือกเปิดฟังก์ชัน "ตรวจสอบพิกัดสถานที่" (Location Verification) และกำหนดรัศมีอนุญาต (เช่น 30 - 100 เมตร) ได้ตามขนาดของห้องบรรยาย เมื่อนิสิตสแกน QR Code ตัวระบบจะร้องขอพิกัด GPS ความแม่นยำสูงผ่าน Web Geolocation API และคำนวณระยะทางจริงด้วยสูตร Haversine หากนิสิตอยู่นอกพื้นที่ที่กำหนด ระบบจะปฏิเสธการเช็คชื่อทันที',
    },
    {
      id: 'zero-install-webapp',
      category: 'general',
      badge: 'Zero Install',
      question: 'นิสิตจำเป็นต้องติดตั้งแอปพลิเคชันหรือลงทะเบียนล่วงหน้าหรือไม่?',
      answer:
        'ไม่จำเป็น นิสิตสามารถเปิดกล้องโทรศัพท์มือถือ (iOS Camera หรือ Android Camera / QR Scanner ทั่วไป) แล้วสแกน QR Code บนจอโปรเจกเตอร์เพื่อเปิดหน้าเว็บเบราว์เซอร์ขึ้นมาเช็คชื่อได้ทันที โดยครั้งแรกระบบจะให้นิสิตกรอกรหัสนิสิตและชื่อ-นามสกุลเพื่อสร้าง Attndee. Pass™ ไว้ในเครื่องอัตโนมัติ',
    },
  ];

  const categories = [
    { id: 'all', name: 'ทั้งหมด (All)' },
    { id: 'import-export', name: 'myKU & Excel' },
    { id: 'security', name: 'ความปลอดภัย & QR' },
    { id: 'attendance', name: 'การเช็คชื่อ & สรุปยอด' },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.badge.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white text-black selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
              Attndee<span className="text-blue-600">.</span> Docs
            </h1>
          </div>

          <Link
            href="/docs/full"
            className="px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:border-black hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 font-medium"
          >
            <Home size={16} />
            <span>Full Documentation</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10 sm:py-14">
        {/* Hero Section Banner */}
        <div
          className="w-full rounded-3xl mb-10 bg-cover bg-center relative overflow-hidden shadow-sm"
          style={{ backgroundImage: 'url(/assets/asset_bg_banner01.png)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="relative z-10 text-center py-14 sm:py-20 px-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-medium mb-4 border border-white/20">
              <Sparkles size={14} className="text-blue-400" />
              <span>Attndee Help Center & Knowledge Base</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
              ศูนย์ข้อมูลและการใช้งาน Attndee
            </h2>
            <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto font-light drop-shadow">
              คู่มือระบบเช็คชื่อด้วย Rolling QR Code, การเชื่อมโยง myKU (.xlsx),
              และระบบป้องกันการฝากเช็คชื่อ
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="ค้นหาคำถาม เช่น myKU, Excel SUM, Rolling QR, เช็คชื่อย้อนหลัง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl text-base bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-black placeholder:text-gray-400"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold tracking-tight text-black">
              คำถามที่พบบ่อย (Frequently Asked Questions)
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
              {filteredFaqs.length} ข้อ
            </span>
          </div>

          <div className="space-y-3.5">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-blue-600/40 bg-blue-50/20 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full px-6 py-5 flex items-start sm:items-center justify-between text-left gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-block text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                          {faq.badge}
                        </span>
                      </div>
                      <span className="font-semibold text-black text-base leading-snug">
                        {faq.question}
                      </span>
                    </div>

                    <div className="p-1 rounded-full text-gray-400 hover:text-black mt-1 sm:mt-0 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-blue-600" />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 text-gray-700 text-sm sm:text-base leading-relaxed border-t border-gray-100/80">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">
                ไม่พบคำตอบที่ตรงกับคำค้นหา "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
              >
                ล้างคำค้นหาทั้งหมด
              </button>
            </div>
          )}
        </section>

        {/* Key Features Overview Cards */}
        <section className="mb-14">
          <h3 className="text-xl font-bold tracking-tight text-black mb-4">
            ฟีเจอร์เด่นของ Attndee
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <FileSpreadsheet size={20} />
              </div>
              <h4 className="font-bold text-black mb-1">
                myKU Native XLSX & 1/0 Scoring
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                ลากวางไฟล์รายงานนิสิตจาก myKU ได้ทันที และส่งออกผลเช็คชื่อเป็นเลข 1 และ 0 พร้อมใช้สูตร =SUM() คำนวณต่อได้ทันที
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <QrCode size={20} />
              </div>
              <h4 className="font-bold text-black mb-1">
                30s TOTP Rolling QR Code
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                รหัส QR เปลี่ยนใหม่ทุก 30 วินาที ป้องกันการแคปรูปส่งต่อ พร้อม Grace Window รองรับการดีเลย์ของเครือข่าย
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <UserCheck size={20} />
              </div>
              <h4 className="font-bold text-black mb-1">
                Post-Session Absent Summary
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                สรุปยอดคนขาดทันทีหลังปิดสแกน พร้อมฟังก์ชันกดเช็คชื่อย้อนหลัง (Manual Override) ก่อนกด Export
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-bold text-black mb-1">
                Attndee. Pass™ & Device Fingerprint
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                คูลดาวน์ 7 วันป้องกันการเปลี่ยนรหัสนิสิตสลับไปมา และตรวจจับเบราว์เซอร์หรือโหมด Incognito ป้องกันการฝากเช็คชื่อ
              </p>
            </div>
          </div>
        </section>

        {/* Browse by Topic */}
        <div className="pt-10 border-t border-gray-200">
          <h3 className="text-xl font-bold text-black mb-6">
            อ่านคู่มือฉบับเต็มตามหัวข้อ (Full Documentation)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/docs/full#getting-started"
              className="p-6 border border-gray-200 rounded-2xl hover:border-black hover:bg-gray-50/50 transition-all duration-200 group"
            >
              <h4 className="font-bold text-black mb-1 group-hover:text-blue-600 transition-colors">
                Getting Started →
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                เริ่มต้นใช้งาน Attndee และวิธีสร้างห้องเช็คชื่อสำหรับอาจารย์
              </p>
            </Link>

            <Link
              href="/docs/full#features"
              className="p-6 border border-gray-200 rounded-2xl hover:border-black hover:bg-gray-50/50 transition-all duration-200 group"
            >
              <h4 className="font-bold text-black mb-1 group-hover:text-blue-600 transition-colors">
                Core Features →
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                เจาะลึกระบบ Rolling QR, Geofencing, และการส่งออกคะแนน Excel
              </p>
            </Link>

            <Link
              href="/docs/full#advanced"
              className="p-6 border border-gray-200 rounded-2xl hover:border-black hover:bg-gray-50/50 transition-all duration-200 group"
            >
              <h4 className="font-bold text-black mb-1 group-hover:text-blue-600 transition-colors">
                Advanced & Architecture →
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                สถาปัตยกรรม Supabase Realtime, Webhooks, และ Batch Import
              </p>
            </Link>

            <Link
              href="/docs/full#troubleshooting"
              className="p-6 border border-gray-200 rounded-2xl hover:border-black hover:bg-gray-50/50 transition-all duration-200 group"
            >
              <h4 className="font-bold text-black mb-1 group-hover:text-blue-600 transition-colors">
                Troubleshooting →
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                การแก้ไขปัญหา GPS, ปัญหาสแกน QR ไม่ติด, และคำเตือน Cooldown
              </p>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Attndee<span className="text-blue-600">.</span> Minimalist Attendance Verification System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
