import React, { useState } from 'react';
import { Eye, EyeOff, Download, FileText, X, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { getFileUrl } from '../api/client';
import { useTranslation } from '../hooks/useTranslation';

interface InlineDocViewerProps {
  docPath: string;
  title?: string;
  buttonText?: string;
  className?: string;
  style?: React.CSSProperties;
  initiallyExpanded?: boolean;
}

export const InlineDocViewer: React.FC<InlineDocViewerProps> = ({
  docPath,
  title,
  buttonText,
  className = '',
  style = {},
  initiallyExpanded = false,
}) => {
  const { lang } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!docPath) return null;

  const fileUrl = getFileUrl(docPath);
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(docPath) || docPath.startsWith('data:image');
  const isPdf = /\.pdf$/i.test(docPath) || docPath.startsWith('data:application/pdf');

  const defaultBtnLabel = buttonText || (lang === 'mr' ? 'कागदपत्र पाहा' : 'View Document');
  const hideBtnLabel = lang === 'mr' ? 'कागदपत्र लपवा' : 'Hide Document';
  const displayTitle = title || (lang === 'mr' ? 'संलग्न कागदपत्र / पावती' : 'Attached Document / Receipt');

  return (
    <div className={`inline-doc-viewer ${className} no-print`} style={{ display: 'inline-block', ...style }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: isExpanded ? '#eff6ff' : '#ffffff',
          color: isExpanded ? '#1d4ed8' : '#334155',
          borderColor: isExpanded ? '#93c5fd' : '#cbd5e1',
          fontWeight: 600,
          fontSize: 12,
          transition: 'all 0.2s ease',
        }}
      >
        {isExpanded ? <EyeOff size={14} color="#1d4ed8" /> : <Eye size={14} color="#2563eb" />}
        {isExpanded ? hideBtnLabel : defaultBtnLabel}
      </button>

      {isExpanded && (
        <div
          style={{
            marginTop: 10,
            background: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.15)',
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            right: isFullscreen ? 0 : 'auto',
            bottom: isFullscreen ? 0 : 'auto',
            zIndex: isFullscreen ? 999999 : 1000,
            width: isFullscreen ? '100vw' : '100%',
            height: isFullscreen ? '100vh' : 'auto',
            maxHeight: isFullscreen ? '100vh' : '650px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 10,
              marginBottom: 12,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="#2563eb" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{displayTitle}</span>
              <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                {docPath.split('/').pop() || 'Document'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isImage && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                    title="Zoom In"
                    style={{ padding: '3px 8px' }}
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                    title="Zoom Out"
                    style={{ padding: '3px 8px' }}
                  >
                    <ZoomOut size={14} />
                  </button>
                </>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
                style={{ padding: '3px 8px' }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              <a
                href={fileUrl}
                download
                className="btn btn-secondary btn-sm"
                style={{ padding: '3px 8px', color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                title="Download Document"
              >
                <Download size={14} /> Download
              </a>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <X size={14} /> {lang === 'mr' ? 'लपवा' : 'Hide'}
              </button>
            </div>
          </div>

          {/* Body Viewer Content */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', background: '#f8fafc', borderRadius: 8, padding: 12 }}>
            {isImage ? (
              <div style={{ overflow: 'auto', width: '100%', textAlign: 'center' }}>
                <img
                  src={fileUrl}
                  alt="Attached Document Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: isFullscreen ? 'calc(100vh - 100px)' : '500px',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center top',
                    transition: 'transform 0.2s ease',
                    borderRadius: 6,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  }}
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                title={displayTitle}
                style={{
                  width: '100%',
                  height: isFullscreen ? 'calc(100vh - 100px)' : '500px',
                  border: 'none',
                  borderRadius: 6,
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 24, width: '100%' }}>
                <FileText size={48} color="#64748b" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  {lang === 'mr' ? 'संलग्न कागदपत्र पहा (In-Place Preview)' : 'Attached Document Preview'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                  {docPath.split('/').pop()}
                </div>
                <iframe
                  src={fileUrl}
                  title={displayTitle}
                  style={{ width: '100%', height: '450px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineDocViewer;
