'use client';

/**
 * Full Documentation Page - Attndee
 * 
 * Complete technical and operational documentation covering all sections:
 * - Getting Started: Introduction, Quick Start, Creating Your First Class
 * - Features: Rolling QR Codes, Location Verification, Exporting Attendance, Customization Options
 * - Advanced: API Integration, Webhooks, Batch Operations
 * - Troubleshooting: Common Issues, Connection Problems, QR Code Not Scanning
 */

import { useState, useEffect, ReactNode } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  QrCode,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Webhook,
  Sliders,
  Download,
  Clock,
  Smartphone,
  ExternalLink,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function FullDocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'getting-started',
    'features',
    'advanced',
    'troubleshooting',
  ]);
  const [activeSection, setActiveSection] = useState('introduction');

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && content[hash]) {
        setActiveSection(hash);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const navigation = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      items: [
        { id: 'introduction', title: 'Introduction' },
        { id: 'quick-start', title: 'Quick Start Guide' },
        { id: 'creating-class', title: 'Creating Your First Class' },
      ],
    },
    {
      id: 'features',
      title: 'Features',
      items: [
        { id: 'rolling-qr', title: 'Rolling QR Codes (TOTP)' },
        { id: 'location-verify', title: 'Location Verification (GPS)' },
        { id: 'attendance-export', title: 'Exporting Attendance (myKU .xlsx)' },
        { id: 'customization', title: 'Customization Options' },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced & Architecture',
      items: [
        { id: 'api-integration', title: 'API Integration & Supabase' },
        { id: 'webhooks', title: 'Realtime & Webhooks' },
        { id: 'batch-operations', title: 'Batch Operations & Roster Parsing' },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting & Support',
      items: [
        { id: 'common-issues', title: 'Common Issues' },
        { id: 'connection-problems', title: 'Connection & Network Lag' },
        { id: 'qr-not-scanning', title: 'QR Code Scanning Difficulties' },
      ],
    },
  ];

  const content: Record<string, { title: string; content: ReactNode }> = {
    introduction: {
      title: 'Introduction to Attndee',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p className="text-lg text-gray-800 font-normal">
            <strong>Attndee</strong> คือระบบบันทึกและตรวจสอบการเข้าชั้นเรียนแบบไร้สัมผัส (Contactless Attendance Verification System) ที่ถูกออกแบบมาเพื่อแก้ไขปัญหาการทุจริตเช็คชื่อแทนกัน (Proxy Check-in) และลดภาระงานด้านเอกสารของคณาจารย์อย่างสิ้นเชิง
          </p>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 my-6">
            <div className="flex items-start gap-3">
              <div className="p-1 text-blue-600 flex-shrink-0 mt-0.5">
                <Info size={20} />
              </div>
              <div className="text-sm text-blue-950 space-y-1">
                <p className="font-semibold text-blue-900">
                  สถาปัตยกรรมระดับ Production-Grade
                </p>
                <p>
                  ระบบพัฒนาบน Next.js 16 (App Router), React 19, Supabase PostgreSQL Realtime, และ Tailwind CSS v4 ภายใต้มาตรฐานความปลอดภัยระดับมหาวิทยาลัย
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-black mt-8 mb-4">จุดเด่นสำคัญของระบบ (Core Pillars)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
                1
              </div>
              <h3 className="font-bold text-black mb-1">30s TOTP Rolling QR Code</h3>
              <p className="text-sm text-gray-600">
                รหัส QR เปลี่ยนชุดใหม่ทุก 30 วินาที ป้องกันการแคปภาพหน้าจอส่งต่อ พร้อมกลไก Grace Window รองรับการดีเลย์
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
                2
              </div>
              <h3 className="font-bold text-black mb-1">myKU Native Auto-Parser</h3>
              <p className="text-sm text-gray-600">
                ลากวางไฟล์ Excel (.xlsx) จากระบบ myKU ได้ทันที ระบบตัดหัวกระดาษและสกัดรหัสนิสิต 10 หลักให้อัตโนมัติ
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
                3
              </div>
              <h3 className="font-bold text-black mb-1">Excel SUM-Ready 1 / 0 Export</h3>
              <p className="text-sm text-gray-600">
                ส่งออกผลการเช็คชื่อเป็นตัวเลข 1 (มา) และ 0 (ขาด) พร้อมใช้สูตร <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-700">=SUM()</code> รวมคะแนนได้ทันที
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
                4
              </div>
              <h3 className="font-bold text-black mb-1">Attndee. Pass™ & Device Fingerprint</h3>
              <p className="text-sm text-gray-600">
                คูลดาวน์ 7 วันป้องกันการเปลี่ยนรหัสนิสิต และตรวจจับฮาร์ดแวร์ประจำเครื่อง บล็อกโหมดไม่ระบุตัวตน (Incognito)
              </p>
            </div>
          </div>
        </div>
      ),
    },

    'quick-start': {
      title: 'Quick Start Guide',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-4">เริ่มต้นใช้งานใน 3 ขั้นตอนง่ายๆ</h2>

          <div className="space-y-6 my-6">
            <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                  1
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-black">
                    นำเข้ารายชื่อจาก myKU หรือสร้างห้องเรียนด่วน
                  </h3>
                  <p className="text-gray-600">
                    เข้าสู่หน้าแรก Attndee และเลือกสร้างห้องเรียน คุณสามารถลากไฟล์รายงานรายชื่อนิสิต (.xlsx) จาก myKU มาวางได้ทันที หรือพิมพ์ชื่อวิชาและกำหนดการตรวจสอบพิกัด GPS
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pt-1">
                    <li>ระบบดึงรหัสวิชา ชื่อวิชา และหมู่เรียนอัตโนมัติ</li>
                    <li>ตรวจสอบความถูกต้องของรหัสนิสิต 10 หลัก</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                  2
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-black">
                    เปิดฉาย Rolling QR Code บนหน้าจอห้องเรียน
                  </h3>
                  <p className="text-gray-600">
                    นำหน้าจอ QR Code ขึ้นโปรเจกเตอร์หรือจอมอนิเตอร์ในห้องเรียน รหัสจะเปลี่ยนชุดใหม่ทุกๆ 30 วินาที นิสิตใช้สมาร์ตโฟนสแกนเพื่อยืนยันตัวตนผ่านเบราว์เซอร์โดยไม่ต้องติดตั้งแอปพลิเคชัน
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pt-1">
                    <li>กระดานอาจารย์จะแสดงยอดผู้เช็คชื่อแบบ Real-time ทันที</li>
                    <li>หากเปิด GPS ระบบจะวัดระยะห่างระหว่างเครื่องนิสิตกับห้องเรียน</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                  3
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-black">
                    สรุปยอดคนขาด เช็คชื่อย้อนหลัง และส่งออก Excel (1/0)
                  </h3>
                  <p className="text-gray-600">
                    เมื่อหมดเวลาเรียน ให้กดปุ่ม "ปิดรับการสแกน" (End Session) ระบบจะสรุปรายชื่อนิสิตที่ขาดเรียน อาจารย์สามารถตรวจสอบและกดเช็คชื่อย้อนหลัง (Manual Override) ได้ แล้วจึงกด "Export XLSX" เพื่อนำไฟล์คะแนนไปใช้ต่อทันที
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    'creating-class': {
      title: 'Creating Your First Class',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p className="text-base text-gray-700">
            ระบบ Attndee รองรับการสร้างห้องเรียน 2 รูปแบบ เพื่อความยืดหยุ่นสูงสุดในการสอน:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
            <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-3">
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                โหมดที่ 1: แนะนำ
              </span>
              <h3 className="text-xl font-bold text-black">
                myKU Roster Import (.xlsx)
              </h3>
              <p className="text-sm text-gray-600">
                นำเข้าไฟล์รายงานรายชื่อนิสิตจาก myKU ระบบจะแมปรายชื่อนิสิตทุกคนเข้ากับห้องเรียน เมื่อจบคาบจะสามารถส่งออกไฟล์เดิมพร้อมเติมผลคะแนน 1 และ 0 ได้อย่างแม่นยำ
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-3">
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                โหมดที่ 2: รวดเร็ว
              </span>
              <h3 className="text-xl font-bold text-black">
                Quick Attendance (Ad-hoc)
              </h3>
              <p className="text-sm text-gray-600">
                สร้างห้องเรียนแบบด่วนโดยไม่ต้องใช้ไฟล์รายชื่อ เหมาะสำหรับการบรรยายพิเศษ, สัมมนา, หรือการรวมกลุ่มทำกิจกรรมที่ไม่มีรายชื่อล่วงหน้า
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-black mt-8 mb-4">
            การกำหนดค่าห้องเรียน (Configuration Settings)
          </h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Subject Code & Name:</strong> รหัสและชื่อรายวิชา (เช่น 01418xxx Computer Networks)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Section (หมู่เรียน):</strong> กำหนดหมู่บรรยายเพื่อแยกกลุ่มนิสิต</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Location Verification:</strong> เลือกว่าต้องการบังคับให้เช็คอินเฉพาะในห้องเรียนหรือไม่</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Allowed Radius (รัศมี):</strong> กำหนดระยะห่างที่ยอมรับได้ (เช่น 50 เมตร)</span>
            </li>
          </ul>
        </div>
      ),
    },

    'rolling-qr': {
      title: 'Rolling QR Codes (TOTP)',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            สถาปัตยกรรม Time-based One-Time Password (TOTP)
          </h2>
          <p>
            หัวใจหลักของความปลอดภัยใน Attndee คือเทคโนโลยี <strong>Rolling QR Code</strong> ที่สร้างขึ้นตามมาตรฐาน RFC 6238 โดยใช้กุญแจลับเฉพาะ (Session Secret) ร่วมกับตัวแปรเวลาปัจจุบัน ทำให้รหัสที่แสดงบนจอมีอายุจำกัดเพียง <strong>30 วินาที</strong>
          </p>

          <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50 space-y-4 my-6">
            <h3 className="font-bold text-black text-lg">ทำไม Static QR Code ถึงไม่ปลอดภัย?</h3>
            <p className="text-sm text-gray-600">
              ในการเช็คชื่อแบบเดิม นิสิตเพียงแค่ถ่ายภาพ QR Code แล้วส่งต่อไปยังกลุ่มแชต (LINE, Discord, Telegram) หรือ AirDrop ให้เพื่อนที่ยังนอนอยู่ที่หอพักสแกนได้ทันที การใช้ Rolling QR ทำให้ภาพถ่ายหมดอายุภายในไม่กี่วินาที
            </p>
          </div>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            กลไก Grace Window (ความหน่วงเครือข่าย)
          </h3>
          <p>
            ในการใช้งานจริง นิสิตอาจพบปัญหาเน็ตช้าหรือความล่าช้าขณะที่มือถือกำลังค้นหาพิกัดดาวเทียม GPS เพื่อแก้ปัญหานี้ Attndee ได้บรรจุระบบ <strong>Grace Window (±1 time step)</strong>:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 ml-2">
            <li>เซิร์ฟเวอร์จะยอมรับ Token ปัจจุบัน (T0) และ Token ในช่วง 30 วินาทีก่อนหน้า (T-1)</li>
            <li>ทำให้นิสิตที่กดสแกนตรงวินาทีสุดท้ายของรอบยังคงเช็คชื่อสำเร็จโดยไม่ต้องสแกนซ้ำ</li>
            <li>โทเคนที่เก่าเกิน 60 วินาทีจะถูกเซิร์ฟเวอร์ปฏิเสธทันที</li>
          </ul>
        </div>
      ),
    },

    'location-verify': {
      title: 'Location Verification (GPS Geofencing)',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            การตรวจสอบพิกัดภูมิศาสตร์ความแม่นยำสูง
          </h2>
          <p>
            เมื่ออาจารย์เปิดใช้งาน <strong>Location Verification</strong> พิกัด GPS ของผู้สอน (ละติจูดและลองจิจูด) จะถูกบันทึกเป็นจุดศูนย์กลางของห้องเรียน เมื่อนิสิตสแกน QR Code เบราว์เซอร์ของนิสิตจะขอสิทธิ์เข้าถึงพิกัด GPS เพื่อส่งไปตรวจสอบระยะห่าง
          </p>

          <h3 className="text-xl font-bold text-black mt-6 mb-3">
            สูตรคำนวณระยะทาง Haversine Formula
          </h3>
          <p className="text-sm">
            ระบบคำนวณระยะทางระหว่างพิกัดผู้สอนกับพิกัดนิสิตบนพื้นผิวโลกทรงกลมด้วยสูตร:
          </p>
          <div className="bg-neutral-900 text-gray-100 p-4 rounded-xl font-mono text-xs sm:text-sm overflow-x-auto my-3">
            d = 2R × arcsin(√[sin²(Δφ/2) + cos(φ₁)cos(φ₂)sin²(Δλ/2)])
          </div>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            คำแนะนำในการตั้งค่ารัศมี (Recommended Radius)
          </h3>
          <div className="space-y-3">
            <div className="p-4 border border-gray-200 rounded-xl bg-white">
              <span className="font-bold text-black block mb-1">ห้องเรียนขนาดเล็ก (20–40 ที่นั่ง): 30–40 เมตร</span>
              <p className="text-xs text-gray-600">เหมาะสำหรับห้องสัมมนา หรือห้องแล็บคอมพิวเตอร์</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-xl bg-white">
              <span className="font-bold text-black block mb-1">ห้องบรรยายขนาดกลาง (100–200 ที่นั่ง): 50–70 เมตร</span>
              <p className="text-xs text-gray-600">ค่ามาตรฐานแนะนำ รองรับความคลาดเคลื่อนของ GPS ภายในอาคารเรียนรวม</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-xl bg-white">
              <span className="font-bold text-black block mb-1">หอประชุมหรืออาคารใหญ่ (300+ ที่นั่ง): 80–120 เมตร</span>
              <p className="text-xs text-gray-600">ป้องกันปัญหาคอนกรีตหนาบังสัญญาณดาวเทียม</p>
            </div>
          </div>
        </div>
      ),
    },

    'attendance-export': {
      title: 'Exporting Attendance (myKU .xlsx)',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            ระบบส่งออกไฟล์คะแนน Excel SUM-Ready
          </h2>
          <p>
            ปัญหาใหญ่ของระบบเช็คชื่อทั่วไปคือการส่งออกข้อมูลเป็นตัวอักษร เช่น "Present" หรือ "Absent" ซึ่งผู้สอนต้องนำมาจัดเรียงและเขียนสูตรแปลงค่าใหม่เองใน Excel
          </p>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 my-6">
            <h3 className="font-bold text-emerald-950 mb-2">
              มาตรฐานตัวเลข 1 และ 0 (Excel SUM Ready)
            </h3>
            <p className="text-sm text-emerald-900 leading-relaxed">
              Attndee จะส่งออกไฟล์ <strong>.xlsx</strong> ที่คงโครงสร้างเดิมของ myKU ไว้อย่างครบถ้วน โดยเติมข้อมูลการเช็คชื่อของแต่ละคาบเรียนเป็นค่าตัวเลข:
            </p>
            <div className="flex gap-4 mt-3 text-sm font-semibold">
              <span className="px-3 py-1 bg-white rounded-lg border border-emerald-300 text-emerald-700">
                1 = มาเรียน (Present)
              </span>
              <span className="px-3 py-1 bg-white rounded-lg border border-rose-300 text-rose-700">
                0 = ขาดเรียน (Absent)
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            การรวมคะแนนด้วยสูตร Excel ทันที
          </h3>
          <p className="text-sm">
            อาจารย์สามารถคลิกที่เซลล์รวมคะแนนท้ายตาราง แล้วลากสูตรผลรวมได้ทันที:
          </p>
          <div className="bg-neutral-900 text-emerald-400 p-4 rounded-xl font-mono text-sm my-3">
            =SUM(G6:T6)
          </div>
          <p className="text-xs text-gray-500">
            *ตัวอย่างสูตรคำนวณคะแนนเข้าเรียนของนิสิตตลอด 14 สัปดาห์
          </p>
        </div>
      ),
    },

    'customization': {
      title: 'Customization Options',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            การปรับแต่งตามความต้องการของผู้สอน
          </h2>
          <p>
            ระบบ Attndee อนุญาตให้ผู้สอนปรับแต่งการทำงานได้อย่างยืดหยุ่นผ่านแผงควบคุม:
          </p>

          <div className="space-y-4 my-6">
            <div className="p-5 border border-gray-200 rounded-2xl bg-white">
              <h3 className="font-bold text-black mb-1 flex items-center gap-2">
                <Sliders size={18} className="text-blue-600" />
                <span>Geofencing Radius Adjustment</span>
              </h3>
              <p className="text-sm text-gray-600">
                สามารถสไลด์ปรับระยะห่างได้ตั้งแต่ 20 เมตร ถึง 200 เมตร หรือคลิกปิด Location Check เพื่อเช็คชื่อในกรณีสอนออนไลน์ผ่าน Zoom/Google Meet
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white">
              <h3 className="font-bold text-black mb-1 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                <span>Active Session Timer & Auto-close</span>
              </h3>
              <p className="text-sm text-gray-600">
                กำหนดเวลาหมดอายุของคาบเรียน หรือกดปิดรับการสแกนด้วยตนเองเมื่อเริ่มสอนเนื้อหา
              </p>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white">
              <h3 className="font-bold text-black mb-1 flex items-center gap-2">
                <Smartphone size={18} className="text-blue-600" />
                <span>Attndee. Pass™ Student Profile</span>
              </h3>
              <p className="text-sm text-gray-600">
                นิสิตสามารถตรวจสอบข้อมูลบัตรผ่านของตนเอง (ชื่อ-นามสกุล, รหัสประจำตัว, ชั้นปี) ผ่านการ์ด PassCard บนหน้าจอสมาร์ตโฟน
              </p>
            </div>
          </div>
        </div>
      ),
    },

    'api-integration': {
      title: 'API Integration & Supabase',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            สถาปัตยกรรมฐานข้อมูลและ REST / PostgREST API
          </h2>
          <p>
            Attndee ทำงานร่วมกับ <strong>Supabase (PostgreSQL)</strong> ซึ่งรองรับการจัดการสิทธิ์ Row Level Security (RLS) และ High-concurrency Check-in
          </p>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            โครงสร้างตารางหลัก (Database Schema)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 text-gray-800 font-semibold">
                <tr>
                  <th className="p-3 border-b border-gray-200">Table</th>
                  <th className="p-3 border-b border-gray-200">Primary Key</th>
                  <th className="p-3 border-b border-gray-200">Key Columns</th>
                  <th className="p-3 border-b border-gray-200">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                <tr className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-medium">rooms</td>
                  <td className="p-3 font-mono text-xs">id (uuid)</td>
                  <td className="p-3 font-mono text-xs">room_code, secret_key, lat, lng, radius</td>
                  <td className="p-3">ข้อมูลห้องเรียนและพิกัดภูมิศาสตร์</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-medium">roster_students</td>
                  <td className="p-3 font-mono text-xs">id (uuid)</td>
                  <td className="p-3 font-mono text-xs">room_id, student_id, name, section</td>
                  <td className="p-3">รายชื่อนิสิตที่นำเข้าจาก myKU</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-medium">checkins</td>
                  <td className="p-3 font-mono text-xs">id (uuid)</td>
                  <td className="p-3 font-mono text-xs">room_id, student_id, fingerprint, distance</td>
                  <td className="p-3">ประวัติการสแกนและผลการตรวจสอบ</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            การ Query ข้อมูลผ่าน Supabase SDK
          </h3>
          <div className="bg-neutral-900 text-gray-100 p-4 rounded-xl font-mono text-xs sm:text-sm overflow-x-auto">
{`// ดึงข้อมูลการเช็คชื่อแบบเรียลไทม์
const { data: checkins, error } = await supabase
  .from('checkins')
  .select('student_id, student_name, created_at, distance_meters')
  .eq('room_id', currentRoomId)
  .order('created_at', { ascending: false });`}
          </div>
        </div>
      ),
    },

    'webhooks': {
      title: 'Realtime & Webhooks',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            การแจ้งเตือน Realtime และการเชื่อมต่อ Webhook
          </h2>
          <p>
            Attndee ใช้ระบบ <strong>Supabase Realtime (WebSocket channels)</strong> เพื่อให้อาจารย์เห็นยอดผู้เข้าเรียนแบบทันทีทันใดโดยไม่ต้องกดรีเฟรชหน้าจอ (Zero Latency Roll-call)
          </p>

          <div className="p-5 border border-gray-200 rounded-2xl bg-gray-50/50 my-6 space-y-3">
            <h3 className="font-bold text-black flex items-center gap-2">
              <Webhook size={18} className="text-blue-600" />
              <span>Realtime Broadcast Event Flow</span>
            </h3>
            <p className="text-sm text-gray-600">
              เมื่อนิสิตสแกน QR Code สำเร็จ เซิร์ฟเวอร์จะทำ <code>INSERT</code> ลงในตาราง <code>checkins</code> และกระจาย WebSocket event ไปยังหน้าจอ Dashboard ของผู้สอนทันที
            </p>
          </div>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            การเชื่อมต่อกับระบบภายนอก (LMS & Bot Webhooks)
          </h3>
          <p className="text-sm">
            สามารถนำฐานข้อมูล Supabase ไปเชื่อมต่อกับ Discord Webhook หรือ LINE Notify เพื่อแจ้งเตือนสรุปยอดการเข้าเรียนไปยังกลุ่มผู้สอนได้อัตโนมัติเมื่อปิดห้องเรียน
          </p>
        </div>
      ),
    },

    'batch-operations': {
      title: 'Batch Operations & Roster Parsing',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            การประมวลผลข้อมูลรายชื่อขนาดใหญ่ (myKU Batch Parser)
          </h2>
          <p>
            ไฟล์รายงานนิสิตที่ดาวน์โหลดจากระบบ myKU ของมหาวิทยาลัยเกษตรศาสตร์จะมีส่วนหัวกระดาษ (Header Rows) ข้อมูลคณะ และวันที่พิมพ์รายงาน ซึ่งทำให้เกิดปัญหากับโปรแกรมนำเข้าข้อมูลทั่วไป
          </p>

          <div className="p-5 border border-gray-200 rounded-2xl bg-white my-6 space-y-3">
            <h3 className="font-bold text-black text-lg">
              กลไกการสกัดข้อมูลอัจฉริยะ (Smart Auto-Extraction)
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Header Detection:</strong> ตรวจจับและข้ามแถวหัวกระดาษ 5–8 แถวแรกของ myKU อัตโนมัติ</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Student ID Regex:</strong> กรองเฉพาะเซลล์ที่มีรูปแบบรหัสนิสิต 10 หลัก (เช่น <code>65130500xxx</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Thai Name Tokenizer:</strong> แยกคำนำหน้าชื่อ, ชื่อ, และนามสกุลภาษาไทยได้อย่างถูกต้อง</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },

    'common-issues': {
      title: 'Common Issues & Solutions',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-4">
            ปัญหาที่พบบ่อยและแนวทางแก้ไข (Common Issues)
          </h2>

          <div className="space-y-4">
            <div className="p-5 border border-gray-200 rounded-2xl bg-white">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-black text-base">
                    1. ไม่อนุญาตสิทธิ์ตำแหน่งที่ตั้ง (Location Permission Denied)
                  </h3>
                  <p className="text-sm text-gray-600">
                    <strong>วิธีแก้:</strong> ให้นิสิตกดไอคอนรูปกุญแจหรือการตั้งค่าเว็บไซต์บนแถบ URL ของ Safari หรือ Chrome แล้วเปลี่ยนค่า "Location" จาก "บล็อก" เป็น "อนุญาต" จากนั้นรีเฟรชหน้าเว็บอีกครั้ง
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-black text-base">
                    2. เวลาเครื่องไม่ตรง (Device Clock Skew / Expired Token)
                  </h3>
                  <p className="text-sm text-gray-600">
                    <strong>วิธีแก้:</strong> หากนาฬิกาของมือถือนิสิตตั้งเวลาเองและคลาดเคลื่อนเกิน 1 นาที รหัส TOTP จะไม่ตรงกับเซิร์ฟเวอร์ ให้นิสิตเปิด "ตั้งเวลาอัตโนมัติ" (Set Time Automatically) ในการตั้งค่าของโทรศัพท์
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-2xl bg-white">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-black text-base">
                    3. คูลดาวน์บัตรผ่านยังไม่หมด (7-Day Pass Cooldown Active)
                  </h3>
                  <p className="text-sm text-gray-600">
                    <strong>วิธีแก้:</strong> หากนิสิตพยายามสลับรหัสประจำตัวเพื่อเช็คชื่อให้เพื่อน เครื่องจะแสดงคำเตือนคูลดาวน์ 7 วัน ในกรณีที่นิสิตเปลี่ยนเครื่องจริงหรือพิมพ์รหัสผิด ให้แจ้งอาจารย์ผู้สอนเพื่อทำการแก้ไขรายชื่อย้อนหลังผ่านหน้า Post-Session Summary
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    'connection-problems': {
      title: 'Connection Problems & Network Lag',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            การรับมือกับปัญหาสัญญาณอินเทอร์เน็ตในห้องเรียน
          </h2>
          <p>
            ในอาคารเรียนขนาดใหญ่ที่มีนิสิตเข้าใช้งานพร้อมกันหลักร้อยคน สัญญาณมือถือ (4G/5G) หรือ Wi-Fi อาจเกิดอาการหน่วงหรือขาดช่วงชั่วขณะ
          </p>

          <h3 className="text-xl font-bold text-black mt-8 mb-3">
            ระบบรองรับความหน่วง (Grace Window Resilience)
          </h3>
          <p className="text-sm">
            Attndee ถูกออกแบบมาให้ทนทานต่อเน็ตกระตุก:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 ml-2">
            <li>แม้สัญญาณจะหลุดไประหว่างการเชื่อมต่อ คำขอที่ถูกส่งออกไปภายในกรอบเวลาผ่อนปรน (Grace Window) จะยังคงถูกบันทึกสำเร็จ</li>
            <li>หน้า Dashboard ของอาจารย์มีระบบ Re-connection อัตโนมัติ หากสัญญาณเน็ตของโปรเจกเตอร์หลุด จะเชื่อมต่อกลับเข้าช่อง Realtime ทันทีที่เน็ตกลับมา</li>
          </ul>
        </div>
      ),
    },

    'qr-not-scanning': {
      title: 'QR Code Not Scanning',
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-black mb-3">
            คำแนะนำเมื่อสแกน QR Code ไม่ติด
          </h2>
          <p>
            หากนิสิตนั่งอยู่แถวหลังหรือแสงในห้องเรียนรบกวนหน้าจอ ให้ปฏิบัติตามข้อแนะนำต่อไปนี้:
          </p>

          <div className="space-y-3 my-4">
            <div className="p-4 border border-gray-200 rounded-xl bg-white flex items-start gap-3">
              <span className="font-bold text-blue-600">1.</span>
              <p className="text-sm text-gray-700">
                <strong>ขยายขนาดหน้าจอ:</strong> อาจารย์สามารถกดปุ่ม Fullscreen (F11) หรือซูมหน้าเว็บเบราว์เซอร์ขึ้น 125%–150% เพื่อให้รหัส QR บนโปรเจกเตอร์มีขนาดใหญ่ขึ้น
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-xl bg-white flex items-start gap-3">
              <span className="font-bold text-blue-600">2.</span>
              <p className="text-sm text-gray-700">
                <strong>ลดแสงสะท้อน:</strong> ปิดไฟดวงที่ส่องตรงกับผืนผ้าโปรเจกเตอร์เพื่อเพิ่มค่า Contrast ให้กล้องมือถือจับโฟกัสได้รวดเร็ว
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-xl bg-white flex items-start gap-3">
              <span className="font-bold text-blue-600">3.</span>
              <p className="text-sm text-gray-700">
                <strong>กล้องติดเครื่อง:</strong> ใช้นิ้วแตะโฟกัสบนหน้าจอมือถือ หรือใช้แอปพลิเคชัน Camera ดั้งเดิมของ iOS/Android แทนการเปิดผ่านแอปพลิเคชันอื่น
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-xl bg-white flex items-start gap-3">
              <span className="font-bold text-blue-600">4.</span>
              <p className="text-sm text-gray-700">
                <strong>Manual Fallback:</strong> หากนิสิตไม่มีโทรศัพท์หรือกล้องชำรุด อาจารย์สามารถกดเพิ่มรายชื่อนิสิตได้ด้วยมือที่หน้าสรุปผลหลังปิดคาบเรียน
              </p>
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="min-h-screen bg-white flex text-black">
      {/* Sidebar Navigation */}
      <aside
        className={`
          ${sidebarOpen ? 'w-80' : 'w-0'} 
          border-r border-gray-200 bg-white transition-all duration-300 overflow-hidden
          fixed lg:sticky top-0 h-screen z-20 flex flex-col
        `}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <Link href="/docs" className="text-xl font-bold text-black tracking-tight">
            Attndee<span className="text-blue-600">.</span> Docs
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <nav className="space-y-1">
            {navigation.map((section) => {
              const isSectionExpanded = expandedSections.includes(section.id);
              return (
                <div key={section.id} className="mb-2">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <span>{section.title}</span>
                    {isSectionExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  {isSectionExpanded && (
                    <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-gray-100 ml-3">
                      {section.items.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveSection(item.id);
                              window.location.hash = item.id;
                              if (window.innerWidth < 1024) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={`
                              w-full text-left px-3 py-2 text-sm rounded-xl transition-all
                              ${
                                isActive
                                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
                              }
                            `}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
          <span>Attndee v0.1 • Production Docs</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="border-b border-gray-200 bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-700 transition-colors"
                aria-label="Toggle navigation"
              >
                <Menu size={20} />
              </button>

              <Link
                href="/docs"
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Back to Docs Home</span>
              </Link>
            </div>

            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors px-3 py-1.5 rounded-full hover:bg-gray-100"
            >
              Exit Documentation
            </Link>
          </div>
        </header>

        {/* Article Body */}
        <div className="max-w-4xl w-full mx-auto px-6 py-10 sm:py-14 flex-1">
          <div className="border-b border-gray-200 pb-6 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">
              Documentation Article
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight">
              {content[activeSection]?.title || 'Attndee Documentation'}
            </h1>
          </div>

          <article>
            {content[activeSection]?.content || (
              <p className="text-gray-500">
                กรุณาเลือกหัวข้อจากเมนูแถบข้างเพื่อเริ่มอ่านคู่มือ
              </p>
            )}
          </article>

          {/* Footer Navigation */}
          <div className="mt-16 pt-8 border-t border-gray-200 flex items-center justify-between">
            <Link
              href="/docs"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
            >
              <span>← กลับสู่หน้าหลักคู่มือ (Docs Home)</span>
            </Link>

            <span className="text-xs text-gray-400">
              อัปเดตล่าสุด: ตุลาคม 2026
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
