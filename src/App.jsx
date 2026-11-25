import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Building2, Calendar, Clock, Users, Search, CheckCircle2, XCircle,
  Clock4, LogOut, UserCheck, ShieldCheck, PlusCircle, FileText,
  MapPin, Sparkles, AlertCircle, Eye, EyeOff, ArrowRight
} from 'lucide-react';

const FACULTIES = [
  'วิทยาลัยดิจิทัลและนวัตกรรมเทคโนโลยี',
  'คณะวิศวกรรมศาสตร์',
  'วิทยาลัยแพทยศาสตร์',
  'คณะทันตแพทยศาสตร์',
  'คณะเภสัชศาสตร์',
  'คณะพยาบาลศาสตร์',
  'คณะบริหารธุรกิจ',
  'คณะบัญชี',
  'คณะนิติศาสตร์',
  'คณะนิเทศศาสตร์',
  'คณะศิลปศาสตร์',
  'วิทยาลัยการท่องเที่ยว การบริการ และกีฬา',
  'สโมสรนักศึกษา / ชมรม',
  'หน่วยงาน / สำนักภายในมหาวิทยาลัย'
];

export default function App() {
  // Auth & User State
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Auth Form State
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [faculty, setFaculty] = useState(FACULTIES[0]);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('student');
  const [authError, setAuthError] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // App Data State
  const [activeTab, setActiveTab] = useState('facilities'); // 'facilities' | 'book' | 'my-bookings' | 'admin'
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [scheduleModalFacility, setScheduleModalFacility] = useState(null);

  // Booking Form State
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [attendees, setAttendees] = useState('');
  const [purpose, setPurpose] = useState('');
  const [bookingFeedback, setBookingFeedback] = useState({ type: '', message: '' });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Admin Note State
  const [adminNotes, setAdminNotes] = useState({});

  // 1. ตรวจสอบ Session การเข้าสู่ระบบเมื่อเปิดเว็บ
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ดึงข้อมูลโปรไฟล์ผู้ใช้
  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      setOrganizer(data.faculty);
      if (data.role === 'admin') {
        setActiveTab('admin');
      }
    }
    setAuthLoading(false);
  };

  // ดึงข้อมูลสถานที่และรายการจองจาก Supabase
  const fetchAppData = async () => {
    setLoadingData(true);
    const { data: facData } = await supabase
      .from('facilities')
      .select('*')
      .eq('is_active', true)
      .order('id');

    const { data: bookData } = await supabase
      .from('bookings')
      .select('*, facilities(name, building), profiles(full_name, student_id, faculty, phone)')
      .order('created_at', { ascending: false });

    if (facData) {
      setFacilities(facData);
      if (facData.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(String(facData[0].id));
      }
    }
    if (bookData) {
      setBookings(bookData);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (user) {
      fetchAppData();
    }
  }, [user]);

  // 2. จัดการเข้าสู่ระบบด้วยรหัสนักศึกษา
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSubmittingAuth(true);
    try {
      const fakeEmail = `${studentId.trim()}@rsu.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password
      });
      if (error) throw new Error('รหัสนักศึกษา/บุคลากร หรือรหัสผ่านไม่ถูกต้อง');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  // 3. จัดการลงทะเบียนใช้งานใหม่
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (studentId.trim().length < 5) {
      return setAuthError('กรุณากรอกรหัสนักศึกษาหรือรหัสบุคลากรให้ถูกต้อง');
    }
    if (password.length < 6) {
      return setAuthError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    setSubmittingAuth(true);
    try {
      const fakeEmail = `${studentId.trim()}@rsu.local`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('รหัสนักศึกษา/บุคลากรนี้ถูกลงทะเบียนในระบบแล้ว');
        }
        throw signUpError;
      }

      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            student_id: studentId.trim(),
            full_name: fullName.trim(),
            faculty,
            phone: phone.trim(),
            role
          }
        ]);
        if (profileError) throw profileError;
        await fetchProfile(authData.user.id);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab('facilities');
  };

  // 4. ตรวจสอบเวลาจองซ้ำ (Conflict Check)
  const checkTimeConflict = (facId, date, start, end) => {
    return bookings.find(b => {
      if (String(b.facility_id) !== String(facId)) return false;
      if (b.booking_date !== date) return false;
      if (b.status === 'rejected') return false;
      const bStart = b.start_time.slice(0, 5);
      const bEnd = b.end_time.slice(0, 5);
      return start < bEnd && end > bStart;
    });
  };

  // 5. ส่งคำร้องขอใช้สถานที่
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setBookingFeedback({ type: '', message: '' });

    if (startTime >= endTime) {
      return setBookingFeedback({ type: 'error', message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' });
    }

    const selectedFac = facilities.find(f => String(f.id) === String(selectedFacilityId));
    if (selectedFac && Number(attendees) > selectedFac.capacity) {
      return setBookingFeedback({
        type: 'error',
        message: `จำนวนผู้เข้าร่วม (${attendees} คน) เกินความจุสูงสุดของสถานที่ (${selectedFac.capacity} คน)`
      });
    }

    const conflict = checkTimeConflict(selectedFacilityId, bookingDate, startTime, endTime);
    if (conflict) {
      return setBookingFeedback({
        type: 'error',
        message: `ไม่สามารถจองได้ เนื่องจากชนกับกิจกรรม "${conflict.event_title}" (${conflict.start_time.slice(0, 5)} - ${conflict.end_time.slice(0, 5)} น.)`
      });
    }

    setSubmittingBooking(true);
    try {
      const { error } = await supabase.from('bookings').insert([
        {
          user_id: user.id,
          facility_id: Number(selectedFacilityId),
          event_title: eventTitle.trim(),
          organizer: organizer.trim(),
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          attendees: Number(attendees),
          purpose: purpose.trim(),
          status: 'pending'
        }
      ]);

      if (error) throw error;

      setBookingFeedback({ type: 'success', message: 'ส่งคำร้องขอใช้สถานที่เรียบร้อยแล้ว!' });
      setEventTitle('');
      setAttendees('');
      setPurpose('');
      await fetchAppData();
      setTimeout(() => {
        setBookingFeedback({ type: '', message: '' });
        setActiveTab('my-bookings');
      }, 1200);
    } catch (err) {
      setBookingFeedback({ type: 'error', message: 'เกิดข้อผิดพลาด: ' + err.message });
    } finally {
      setSubmittingBooking(false);
    }
  };

  // 6. เจ้าหน้าที่อนุมัติ / ไม่อนุมัติคำร้อง
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    const note = adminNotes[bookingId] || (newStatus === 'approved' ? 'อนุมัติให้ใช้สถานที่ตามวันและเวลาที่ขอ' : 'ไม่อนุมัติคำร้อง');
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, admin_note: note })
      .eq('id', bookingId);

    if (!error) {
      await fetchAppData();
    } else {
      alert('ไม่สามารถอัปเดตสถานะได้: ' + error.message);
    }
  };

  // หน้าโหลดข้อมูลเริ่มต้น
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">กำลังเชื่อมต่อระบบ RSU Facility Booking...</p>
        </div>
      </div>
    );
  }

  // หน้า Login & Register (แสดงเมื่อยังไม่เข้าสู่ระบบ)
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-5">
          {/* ฝั่งซ้าย: แบนเนอร์มหาวิทยาลัยรังสิต */}
          <div className="md:col-span-2 bg-gradient-to-b from-blue-900 to-pink-700 text-white p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6">
                <Sparkles className="w-4 h-4 text-pink-300" /> RANGSIT UNIVERSITY
              </div>
              <h1 className="text-2xl font-bold leading-snug mb-3">
                ระบบขอใช้สถานที่<br />ภายในมหาวิทยาลัยรังสิต
              </h1>
              <p className="text-blue-100 text-sm leading-relaxed">
                RSU Facility Booking System ระบบจองห้องประชุม หอประชุม ศาลาดนตรี และพื้นที่จัดกิจกรรมสำหรับนักศึกษาและบุคลากร
              </p>
            </div>

            <div className="space-y-3 text-xs text-blue-100 border-t border-white/20 pt-5 mt-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-300 shrink-0" />
                <span>ตรวจสอบตารางห้องว่างแบบ Real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-300 shrink-0" />
                <span>ป้องกันการจองเวลาซ้ำอัตโนมัติ</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-300 shrink-0" />
                <span>ติดตามสถานะการอนุมัติออนไลน์</span>
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: ฟอร์มเข้าสู่ระบบ / สมัครสมาชิก */}
          <div className="md:col-span-3 p-8">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                  authMode === 'login' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                  authMode === 'register' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ลงทะเบียนใช้งานใหม่
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    รหัสนักศึกษา / รหัสบุคลากร
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 6601234"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="กรอกรหัสผ่านของคุณ"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingAuth ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">รหัสนักศึกษา / บุคลากร *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 6601234"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ประเภทผู้ใช้งาน *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none bg-white"
                    >
                      <option value="student">นักศึกษา / ผู้ขอใช้สถานที่</option>
                      <option value="admin">เจ้าหน้าที่ดูแลสถานที่ (Admin)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นายพิรพัฒน์ วจิรนันทกร"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">คณะ / หน่วยงาน *</label>
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none bg-white"
                    >
                      {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                    <input
                      type="tel"
                      required
                      placeholder="08X-XXX-XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ตั้งรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-50 mt-2"
                >
                  {submittingAuth ? 'กำลังสร้างบัญชี...' : 'ลงทะเบียนและเข้าใช้งานทันที'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // กรองรายการสถานที่
  const categories = ['ทั้งหมด', ...new Set(facilities.map(f => f.category))];
  const filteredFacilities = facilities.filter(f => {
    const matchCat = selectedCategory === 'ทั้งหมด' || f.category === selectedCategory;
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.building.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // กรองรายการจองของผู้ใช้งานปัจจุบัน
  const myBookings = bookings.filter(b => b.user_id === user.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header / Navbar */}
      <header className="bg-blue-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-blue-600 flex items-center justify-center font-bold text-lg shadow">
              RSU
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">ระบบขอใช้สถานที่ มหาวิทยาลัยรังสิต</h1>
              <p className="text-xs text-blue-200">Rangsit University Facility Booking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold flex items-center justify-end gap-1.5">
                {profile.role === 'admin' ? (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">เจ้าหน้าที่</span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">นักศึกษา</span>
                )}
                {profile.full_name} ({profile.student_id})
              </div>
              <div className="text-xs text-blue-300">{profile.faculty}</div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white text-xs font-medium transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-blue-900/60 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto py-2">
            <button
              onClick={() => setActiveTab('facilities')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition ${
                activeTab === 'facilities' ? 'bg-pink-600 text-white shadow' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Building2 className="w-4 h-4" /> สถานที่และตารางว่าง
            </button>
            <button
              onClick={() => setActiveTab('book')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition ${
                activeTab === 'book' ? 'bg-pink-600 text-white shadow' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> ยื่นคำร้องขอใช้สถานที่
            </button>
            <button
              onClick={() => setActiveTab('my-bookings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition ${
                activeTab === 'my-bookings' ? 'bg-pink-600 text-white shadow' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <FileText className="w-4 h-4" /> ติดตามสถานะคำร้อง ({myBookings.length})
            </button>
            {profile.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition ${
                  activeTab === 'admin' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-amber-200 hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> จัดการคำร้อง (เจ้าหน้าที่)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB 1: รายการสถานที่ */}
        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อห้อง หรืออาคาร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-blue-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loadingData ? (
              <p className="text-center py-12 text-slate-500">กำลังโหลดข้อมูลสถานที่...</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFacilities.map(fac => (
                  <div key={fac.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-semibold">
                          {fac.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Users className="w-3.5 h-3.5 text-blue-700" /> {fac.capacity} คน
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{fac.name}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0" /> {fac.building}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {fac.equipment?.map((eq, idx) => (
                          <span key={idx} className="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => setScheduleModalFacility(fac)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                      >
                        ดูคิวจองวันนี้
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFacilityId(String(fac.id));
                          setActiveTab('book');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-semibold text-white transition"
                      >
                        จองสถานที่นี้
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ฟอร์มยื่นคำร้องขอใช้สถานที่ */}
        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">แบบฟอร์มยื่นคำร้องขอใช้สถานที่</h2>
            <p className="text-sm text-slate-500 mb-6">ข้อมูลผู้ขอใช้สถานที่ถูกดึงจากบัญชีของคุณโดยอัตโนมัติ</p>

            {bookingFeedback.message && (
              <div className={`mb-5 p-4 rounded-xl text-sm flex items-center gap-2 ${
                bookingFeedback.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {bookingFeedback.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                <span>{bookingFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">ผู้ยื่นคำร้อง</span>
                  <span className="font-semibold text-slate-800">{profile.full_name} ({profile.student_id})</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">เบอร์โทรศัพท์ติดต่อ</span>
                  <span className="font-semibold text-slate-800">{profile.phone || '-'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เลือกสถานที่ที่ต้องการใช้ *</label>
                <select
                  required
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.building} (รองรับ {f.capacity} คน)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโครงการ / กิจกรรม *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ประชุมเตรียมงานปฐมนิเทศ"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">หน่วยงาน / คณะผู้จัด *</label>
                  <input
                    type="text"
                    required
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ขอใช้ *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลาเริ่มต้น *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลาสิ้นสุด *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนผู้เข้าร่วมโดยประมาณ (คน) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="เช่น 50"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดและอุปกรณ์เพิ่มเติมที่ต้องการ</label>
                <textarea
                  rows="3"
                  placeholder="ระบุรายละเอียดกิจกรรม หรืออุปกรณ์โสตฯ ที่ต้องการใช้งานเพิ่มเติม..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingBooking}
                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submittingBooking ? 'กำลังบันทึกคำร้อง...' : 'ยืนยันส่งคำร้องขอใช้สถานที่'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ติดตามสถานะคำร้องของฉัน */}
        {activeTab === 'my-bookings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">รายการคำร้องขอใช้สถานที่ของคุณ</h2>
            {myBookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <p className="text-slate-500 mb-4">คุณยังไม่มีประวัติการยื่นคำร้องขอใช้สถานที่</p>
                <button
                  onClick={() => setActiveTab('book')}
                  className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-xl"
                >
                  ยื่นคำร้องแรกของคุณ
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {myBookings.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg text-slate-900">{item.event_title}</span>
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <Clock4 className="w-3.5 h-3.5" /> รอเจ้าหน้าที่อนุมัติ
                          </span>
                        )}
                        {item.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-blue-900 font-medium">
                        สถานที่: {item.facilities?.name} ({item.facilities?.building})
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> วันที่ {item.booking_date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> เวลา {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} น.</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item.attendees} คน</span>
                      </div>
                      {item.admin_note && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                          <strong>หมายเหตุจากเจ้าหน้าที่:</strong> {item.admin_note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: แดชบอร์ดอนุมัติสำหรับเจ้าหน้าที่ */}
        {activeTab === 'admin' && profile.role === 'admin' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">รายการคำร้องขอใช้สถานที่ทั้งหมด (สำหรับเจ้าหน้าที่)</h2>
              <span className="text-sm text-slate-500">ทั้งหมด {bookings.length} รายการ</span>
            </div>

            <div className="grid gap-4">
              {bookings.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-900">{item.event_title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.status === 'pending' ? 'รออนุมัติ' : item.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-pink-700">
                        {item.facilities?.name} — {item.facilities?.building}
                      </p>
                      <p className="text-xs text-slate-600">
                        วันที่ <strong>{item.booking_date}</strong> | เวลา <strong>{item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} น.</strong> | ผู้เข้าร่วม {item.attendees} คน
                      </p>
                      <p className="text-xs text-slate-600">
                        ผู้ขอใช้: {item.profiles?.full_name} ({item.profiles?.student_id}) | คณะ: {item.organizer} | โทร: {item.profiles?.phone || '-'}
                      </p>
                      {item.purpose && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg mt-2">
                          รายละเอียดเพิ่มเติม: {item.purpose}
                        </p>
                      )}
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex flex-col gap-2 min-w-[260px]">
                        <input
                          type="text"
                          placeholder="ระบุหมายเหตุ (ถ้ามี)..."
                          value={adminNotes[item.id] || ''}
                          onChange={(e) => setAdminNotes({ ...adminNotes, [item.id]: e.target.value })}
                          className="px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateBookingStatus(item.id, 'approved')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <UserCheck className="w-4 h-4" /> อนุมัติ
                          </button>
                          <button
                            onClick={() => handleUpdateBookingStatus(item.id, 'rejected')}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-4 h-4" /> ไม่อนุมัติ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal ดูคิวจองของสถานที่ */}
      {scheduleModalFacility && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{scheduleModalFacility.name}</h3>
                <p className="text-xs text-slate-500">{scheduleModalFacility.building}</p>
              </div>
              <button
                onClick={() => setScheduleModalFacility(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {bookings.filter(b => b.facility_id === scheduleModalFacility.id && b.status !== 'rejected').length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">ยังไม่มีรายการจองสำหรับสถานที่นี้</p>
              ) : (
                bookings
                  .filter(b => b.facility_id === scheduleModalFacility.id && b.status !== 'rejected')
                  .map(b => (
                    <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{b.event_title}</div>
                        <div className="text-slate-500">วันที่ {b.booking_date} | {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)} น.</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <button
              onClick={() => setScheduleModalFacility(null)}
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}