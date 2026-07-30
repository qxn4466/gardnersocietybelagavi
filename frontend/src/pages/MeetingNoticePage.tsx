import React from 'react';
import Header from '../components/Header';
import MeetingNoticeForm from '../components/accountant/MeetingNoticeForm';
import type { User } from '../types';

interface MeetingNoticePageProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const MeetingNoticePage: React.FC<MeetingNoticePageProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  return (
    <div className="page-container">
      <Header
        title="Accountant Dashboard — Meeting Notice (मिटिंग नोटीस)"
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />
      <div className="content-area" style={{ padding: '20px' }}>
        <MeetingNoticeForm user={user} />
      </div>
    </div>
  );
};

export default MeetingNoticePage;
