import React from 'react';
import { ArrowLeft, Bell, ChevronRight, LogOut, Monitor, Moon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import HealthDataPanel from '../components/health/HealthDataPanel';

const SettingsItem = ({ icon, label, value, onClick, danger = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl transition-colors group ${danger ? 'text-red-400 hover:bg-red-500/10 hover:border-red-500/20' : 'text-white hover:bg-white/10'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl ${danger ? 'bg-red-500/20' : 'bg-white/10'}`}>
        {React.createElement(icon, { className: 'w-5 h-5' })}
      </div>
      <span className="font-bold">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      {value ? <span className="text-sm font-medium text-white/40 group-hover:text-white/60">{value}</span> : null}
      <ChevronRight className={`w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity ${danger ? 'text-red-400' : ''}`} />
    </div>
  </button>
);

const SettingsPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await auth.signOut();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-black">Settings</h1>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 px-2">Account</h2>
          <div className="space-y-3">
            <SettingsItem icon={User} label="Edit Profile" onClick={() => navigate('/profile')} />
            <SettingsItem icon={Bell} label="Notifications" value="On" />
          </div>
        </section>

        <HealthDataPanel />

        <section>
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 px-2">Appearance</h2>
          <div className="space-y-3">
            <SettingsItem icon={Moon} label="Dark Mode" value="System" />
            <SettingsItem icon={Monitor} label="Display" value="Compact" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-red-500/60 uppercase tracking-widest mb-4 px-2">Actions</h2>
          <div className="space-y-3">
            <SettingsItem icon={LogOut} label="Log Out" danger onClick={handleLogout} />
          </div>
        </section>

        <div className="text-center pt-8 text-xs font-bold text-white/20">
          NutriFit v1.0.0 (Alpha)
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
