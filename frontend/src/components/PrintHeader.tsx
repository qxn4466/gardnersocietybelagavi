import React, { useEffect, useState } from 'react';
import { fetchOffice } from '../api/client';
import type { OfficeMaster } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface PrintHeaderProps {
  documentTitle?: string;
  subTitle?: string;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({
  documentTitle = 'GENERAL LEDGER',
  subTitle,
}) => {
  const { lang } = useTranslation();
  const [office, setOffice] = useState<OfficeMaster | null>(null);

  useEffect(() => {
    fetchOffice().then(setOffice).catch(() => {});
  }, []);

  const societyName = lang === 'mr'
    ? 'बेळगाव बागायतदार सह. खरेदी विक्री संघ मर्यादित'
    : (office?.office_name || 'Belgaum Gardeners Co-Op Production Supply & Sale Society Ltd.');

  return (
    <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #0f172a', paddingBottom: 12 }}>
      {/* Society Name */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22,
        fontWeight: 900,
        color: '#0f172a',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.2
      }}>
        {societyName}
      </div>

      {/* Document Title */}
      <div style={{
        fontSize: 16,
        fontWeight: 900,
        color: 'var(--blue-800)',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        marginTop: 6
      }}>
        {documentTitle}
      </div>

      {subTitle && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 2 }}>
          {subTitle}
        </div>
      )}

      {/* Address, Phone & GSTIN Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '16px 24px',
        fontSize: 12,
        fontWeight: 600,
        color: '#334155',
        marginTop: 8
      }}>
        <span>📍 <strong>{lang === 'mr' ? 'पत्ता:' : 'Address:'}</strong> {office?.address || (lang === 'mr' ? 'शहापूर, बेळगाव, कर्नाटक - ५९०००३' : 'Shahapur, Belgaum, Karnataka - 590003')}</span>
        <span>📞 <strong>{lang === 'mr' ? 'फोन:' : 'Phone:'}</strong> {office?.phone1 || '0831-2400000'}{office?.phone2 ? ` / ${office.phone2}` : ''}</span>
        <span>🆔 <strong>{lang === 'mr' ? 'जीएसटी क्र:' : 'GSTN:'}</strong> {office?.gst_no || '29AAAAA0000A1Z5'}</span>
      </div>
    </div>
  );
};

export default PrintHeader;

