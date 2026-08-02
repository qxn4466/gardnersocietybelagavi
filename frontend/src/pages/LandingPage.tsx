import React, { useState } from 'react';
import {
  Leaf, Phone, MapPin, Hash, ShieldCheck, LogIn, Clock, Mail,
  ExternalLink, Building2, CheckCircle2, ChevronRight, Award,
  Globe, Users, Sparkles, Navigation, ArrowRight, X, Menu
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface LandingPageProps {
  onOpenLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const { lang, setLang } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-root" style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── 1. TOP HEADER & NAVBAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Logo & Brand Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(5, 150, 105, 0.3)',
              color: '#ffffff'
            }}>
              <Leaf size={26} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {lang === 'mr' ? 'बेळगाव गार्डनर्स को-ऑप सोसायटी' : 'Belgaum Gardeners Co-Op Society'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {lang === 'mr' ? 'उत्पादन पुरवठा आणि विक्री संस्था लि. बेळगाव' : 'Production Supply & Sale Society Ltd.'}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="desktop-only-nav">
            <button onClick={() => scrollToSection('about')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              {lang === 'mr' ? 'संस्थेविषयी (About)' : 'About Us'}
            </button>
            <button onClick={() => scrollToSection('services')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              {lang === 'mr' ? 'सेवा व उपक्रम (Services)' : 'Services'}
            </button>
            <button onClick={() => scrollToSection('details')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              {lang === 'mr' ? 'नोंदणी व तपशील (Details)' : 'Society Info'}
            </button>
            <button onClick={() => scrollToSection('location')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              {lang === 'mr' ? 'पत्ता व नकाशा (Location)' : 'Location & Map'}
            </button>
          </nav>

          {/* Action Buttons: Language Toggle & Menu / Login Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setLang(lang === 'mr' ? 'en' : 'mr')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
                background: '#ffffff', color: '#1e293b', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
              title="Change Language"
            >
              <Globe size={14} color="#059669" />
              <span>{lang === 'mr' ? 'English' : 'मराठी'}</span>
            </button>

            {/* Menu / Login Screen Button */}
            <button
              id="open-login-btn"
              onClick={onOpenLogin}
              style={{
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                color: '#ffffff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.35)',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s'
              }}
            >
              <LogIn size={16} />
              <span>{lang === 'mr' ? 'पोर्टल लॉगिन (Login)' : 'Staff / Member Login'}</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ padding: 8, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              className="mobile-only-toggle"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={() => scrollToSection('about')} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#334155', padding: '8px 0' }}>
              {lang === 'mr' ? 'संस्थेविषयी (About Us)' : 'About Us'}
            </button>
            <button onClick={() => scrollToSection('services')} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#334155', padding: '8px 0' }}>
              {lang === 'mr' ? 'सेवा व उपक्रम (Services)' : 'Services'}
            </button>
            <button onClick={() => scrollToSection('details')} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#334155', padding: '8px 0' }}>
              {lang === 'mr' ? 'नोंदणी व तपशील (Society Info)' : 'Society Info'}
            </button>
            <button onClick={() => scrollToSection('location')} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: 15, fontWeight: 600, color: '#334155', padding: '8px 0' }}>
              {lang === 'mr' ? 'पत्ता व नकाशा (Location & Map)' : 'Location & Map'}
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: '#1d4ed8', color: '#ffffff', fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <LogIn size={18} />
              <span>{lang === 'mr' ? 'पोर्टल लॉगिन उघडा' : 'Open Portal Login'}</span>
            </button>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION WITH HERO visual PHOTO ── */}
      <section style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
        color: '#ffffff', padding: '64px 24px 80px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Background glow effects */}
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }} className="hero-grid">
          
          {/* Left Text Column */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 30, background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: 20 }}>
              <Award size={16} color="#34d399" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {lang === 'mr' ? 'कर्नाटक शासन नोंदणीकृत सहकारी संस्था' : 'Govt. Registered Cooperative Society'}
              </span>
            </div>

            <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, marginBottom: 18, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {lang === 'mr'
                ? 'बेळगाव गार्डनर्स को-ऑप उत्पादन पुरवठा आणि विक्री सोसायटी लि.'
                : 'Belgaum Gardeners Co-operative Production Supply & Sale Society Ltd.'}
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#d1fae5', marginBottom: 28, opacity: 0.95 }}>
              {lang === 'mr'
                ? 'बेळगाव जिल्ह्यातील सर्व शेतकरी, बागायतदार व व्यापाऱ्यांसाठी भाजीपाला, फळे, बियाणे, खते आणि शीतगृह साठवणुकीची विश्वासू मध्यवर्ती सहकारी संस्था.'
                : 'Belgaum’s premier agricultural cooperative serving farmers, horticulturists & traders with seeds, fertilizers, vegetable markets, cold storage & financial deposit management.'}
            </p>

            {/* Quick Badge List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CheckCircle2 size={18} color="#34d399" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{lang === 'mr' ? '१०-अंकी KYC सदस्य ओळख' : '10-Digit KYC ID System'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CheckCircle2 size={18} color="#34d399" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{lang === 'mr' ? '१६ हिशोब खाते संगणकीकृत' : '16 Digital Account Heads'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CheckCircle2 size={18} color="#34d399" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{lang === 'mr' ? 'शीतगृह साठवणूक व विक्री' : 'Cold Storage & Produce Trade'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CheckCircle2 size={18} color="#34d399" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{lang === 'mr' ? 'पारदर्शक ३-स्तरीय प्रणाली' : 'Transparent 3-Tier Accounting'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button
                onClick={onOpenLogin}
                style={{
                  padding: '14px 28px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                  color: '#0f172a', fontSize: 16, fontWeight: 900, cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(217, 119, 6, 0.4)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                <span>{lang === 'mr' ? 'खाते व व्यवहार लॉगिन' : 'Access Account Portal'}</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => scrollToSection('location')}
                style={{
                  padding: '14px 24px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <MapPin size={18} color="#34d399" />
                <span>{lang === 'mr' ? 'पत्ता व लोकेशन पहा' : 'View Address & Map'}</span>
              </button>
            </div>
          </div>

          {/* Right Showcase Photo Card */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '4px solid rgba(255, 255, 255, 0.2)',
              background: '#047857'
            }}>
              <img
                src="/belgaum_hq.png"
                alt="Belgaum Gardeners Society Headquarters"
                style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(15, 23, 42, 0.92) 100%)',
                padding: '24px 28px', color: '#ffffff'
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  {lang === 'mr' ? 'मुख्य प्रशासकीय इमारत व बाजार संकुल' : 'HEADQUARTERS & MARKET COMPLEX'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                  {lang === 'mr' ? 'बेळगाव बागायतदार सह. खरेदी विक्री संघ मर्यादित, बेळगाव' : 'Belgaum Gardeners Co-Op Society Ltd., Belgaum'}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. SOCIETY KEY INFORMATION CARDS (NAME, ADDRESS, PHONE, GSTN) ── */}
      <section id="details" style={{ padding: '64px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#ecfdf5', padding: '6px 14px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
            {lang === 'mr' ? 'अधिकृत माहिती व तपशील' : 'OFFICIAL DETAILS & CREDENTIALS'}
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginTop: 12 }}>
            {lang === 'mr' ? 'संस्थेची मुख्य संपर्क व वैधानिक माहिती' : 'Key Society Credentials & Contacts'}
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 640, margin: '8px auto 0' }}>
            {lang === 'mr' ? 'शासकीय नोंदणी, जीएसटी क्रमांक, कार्यालयीन पत्ता व मुख्य संपर्क क्रमांक' : 'Registered office details, GST identification number, and official lines.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          
          {/* Card 1: Society Name */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderTop: '4px solid #059669' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#059669' }}>
              <Building2 size={24} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'mr' ? 'संस्थेचे नाव (Society Name)' : 'Name of Society'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 8, lineHeight: 1.4 }}>
              {lang === 'mr'
                ? 'बेळगाव गार्डनर्स को-ऑप उत्पादन पुरवठा आणि विक्री सोसायटी लि.'
                : 'Belgaum Gardeners Co-operative Production Supply and Sale Society Ltd.'}
            </div>
            <div style={{ fontSize: 13, color: '#059669', fontWeight: 700, marginTop: 8 }}>
              {lang === 'mr' ? 'बेळगाव, कर्नाटक (Belgaum, Karnataka)' : 'Belgaum, Karnataka'}
            </div>
          </div>

          {/* Card 2: Registered Address */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderTop: '4px solid #2563eb' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#2563eb' }}>
              <MapPin size={24} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'mr' ? 'कार्यालयीन पत्ता (Address)' : 'Registered Address'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 8, lineHeight: 1.5 }}>
              {lang === 'mr'
                ? 'एपीएमसी मुख्य मार्केट यार्ड, किल्ले रस्ता, बेळगाव - ५९००१६, कर्नाटक राज्य, भारत'
                : 'APMC Main Market Yard, Fort Road, Belgaum - 590016, Karnataka State, India'}
            </div>
          </div>

          {/* Card 3: Phone Numbers */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderTop: '4px solid #d97706' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#d97706' }}>
              <Phone size={24} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'mr' ? 'फोन क्रमांक (Phone Numbers)' : 'Official Phone Numbers'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
              +91 (0831) 2400123 / 2400124
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginTop: 4 }}>
              +91 98450 12345 (हेल्पलाइन / WhatsApp)
            </div>
          </div>

          {/* Card 4: GSTN & Registration */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderTop: '4px solid #9333ea' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#9333ea' }}>
              <Hash size={24} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {lang === 'mr' ? 'जीएसटी व नोंदणी क्रमांक (GSTN)' : 'GSTN & Registration No.'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginTop: 8, letterSpacing: '0.04em' }}>
              GSTIN: 29AAAAB1234C1Z5
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>
              Reg No: BGS/COP/1974/KA
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. ABOUT & SERVICES OVERVIEW SECTION ── */}
      <section id="services" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#eff6ff', padding: '6px 14px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
              {lang === 'mr' ? 'मुख्य उपक्रम व सेवा' : 'OUR CORE SERVICES & ACTIVITIES'}
            </span>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginTop: 12 }}>
              {lang === 'mr' ? 'संस्थेमार्फत पुरवल्या जाणाऱ्या प्रमुख सुविधा' : 'Services Offered to Farmers & Members'}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
            
            {/* Service 1 */}
            <div style={{ padding: 24, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🌱</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                {lang === 'mr' ? 'खते व औषधे विक्री' : 'Fertilizers & Pesticides Supply'}
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                {lang === 'mr' ? 'उत्कृष्ट गुणवत्तेची खते, कीटकनाशके आणि प्रमाणित बियाणे रास्त दरात सर्व सभासदांना पुरवले जातात.' : 'Direct distribution of high-grade fertilizers, pesticides & certified seeds at government controlled prices.'}
              </p>
            </div>

            {/* Service 2 */}
            <div style={{ padding: 24, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>❄️</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                {lang === 'mr' ? 'शीतगृह साठवणूक (Cold Storage)' : 'Cold Storage Facilities'}
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                {lang === 'mr' ? 'भाजीपाला, फळे आणि बटाटे दीर्घकाळ ताज्या स्थितीत साठवण्यासाठी आधुनिक शीतगृह साठवणूक सुविधा.' : 'Modern temperature controlled cold storage for perishable vegetables, fruits and commercial crops.'}
              </p>
            </div>

            {/* Service 3 */}
            <div style={{ padding: 24, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>💰</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                {lang === 'mr' ? 'बचत, लक्ष्मी पिग्मी व कर्ज खाती' : 'Savings, Pigmi Deposits & Loans'}
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                {lang === 'mr' ? 'सदस्यांसाठी १०-अंकी ओळख, लक्ष्मी पिग्मी ठेव, कर्ज आणि लाभांश व्याज व्यवस्थापन.' : '10-Digit KYC customer ID, Lakshmi Pigmi daily deposits, agricultural loans, and dividend interest management.'}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. GOOGLE LOCATION MAP AT THE BOTTOM ── */}
      <section id="location" style={{ padding: '64px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#ecfdf5', padding: '6px 14px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
            {lang === 'mr' ? 'गूगल नकाशा व स्थान' : 'GOOGLE LOCATION MAP & NAVIGATION'}
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginTop: 12 }}>
            {lang === 'mr' ? 'सोसायटीचे गूगल मॅप लोकेशन व मार्ग' : 'Visit Our Office in Belgaum'}
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', marginTop: 6 }}>
            {lang === 'mr' ? 'मुख्य मार्केट यार्ड, बेळगाव येथे भेट देण्यासाठी खालील गूगल मॅप वापरा' : 'Use the Google Map below to navigate to our headquarters at Market Yard, Belgaum.'}
          </p>
        </div>

        {/* Map Container & Address Panel */}
        <div style={{
          background: '#ffffff', borderRadius: 24, overflow: 'hidden',
          border: '1px solid #cbd5e1', boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
          display: 'grid', gridTemplateColumns: '1.2fr 0.8fr'
        }} className="map-grid-responsive">

          {/* Embedded Interactive Google Map */}
          <div style={{ width: '100%', minHeight: 400, position: 'relative' }}>
            <iframe
              title="Belgaum Gardeners Society Google Location"
              src="https://maps.google.com/maps?q=Belgaum,Karnataka&t=&z=14&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 400, display: 'block' }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Location & Opening Hours Info Panel */}
          <div style={{ padding: 32, background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={22} color="#059669" />
              <span>{lang === 'mr' ? 'कार्यालय स्थान माहिती' : 'Office Location Info'}</span>
            </h3>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                {lang === 'mr' ? 'पत्ता' : 'Full Address'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 4, lineHeight: 1.5 }}>
                {lang === 'mr'
                  ? 'बेळगाव गार्डनर्स को-ऑप उत्पादन पुरवठा आणि विक्री सोसायटी लि., एपीएमसी मार्केट यार्ड, बेळगाव - ५९००१६, कर्नाटक'
                  : 'Belgaum Gardeners Co-operative Production Supply & Sale Society Ltd., APMC Market Yard, Belgaum - 590016, Karnataka, India'}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                {lang === 'mr' ? 'कामाचे तास' : 'Office Working Hours'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} />
                <span>{lang === 'mr' ? 'सोमवार ते शनिवार: सकाळी ९:०० ते संध्याकाळी ६:००' : 'Mon – Sat: 9:00 AM – 6:00 PM'}</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                {lang === 'mr' ? 'जीएसटीएन क्रमांक' : 'GSTIN Number'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                29AAAAB1234C1Z5
              </div>
            </div>

            <a
              href="https://maps.google.com/?q=Belgaum,Karnataka"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10, background: '#059669', color: '#ffffff',
                fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
              }}
            >
              <ExternalLink size={16} />
              <span>{lang === 'mr' ? 'गूगल मॅपवर दिशा शोधा (Open Directions)' : 'Open in Google Maps'}</span>
            </a>

          </div>

        </div>
      </section>

      {/* ── 6. FOOTER ── */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '40px 24px 24px', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Leaf size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                {lang === 'mr' ? 'बेळगाव गार्डनर्स को-ऑप सोसायटी लि. बेळगाव' : 'Belgaum Gardeners Co-Op Society Ltd.'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                © 2026 Belgaum Gardeners Cooperative. All rights reserved.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onOpenLogin} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {lang === 'mr' ? 'पोर्टल लॉगिन' : 'Staff Portal Login'}
            </button>
            <span>•</span>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
              {lang === 'mr' ? 'वरती जा ↑' : 'Back to top ↑'}
            </button>
          </div>
        </div>
      </footer>

      {/* Inline styles for responsive layout */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .map-grid-responsive { grid-template-columns: 1fr !important; }
          .desktop-only-nav { display: none !important; }
        }
        @media (min-width: 901px) {
          .mobile-only-toggle { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
