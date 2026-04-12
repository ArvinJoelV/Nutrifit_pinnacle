import React from 'react';
import { HeartPulse } from 'lucide-react';
import HealthDataPanel from '../components/health/HealthDataPanel';

const HealthPage = () => {
  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/35">Health</div>
            <h1 className="mt-2 text-3xl font-black text-white">Your synced health data</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/55">
              Manage Google Fit connection, sync your activity, and review the latest wearable metrics here.
            </p>
          </div>
        </div>
      </div>

      <HealthDataPanel showHeader={false} />
    </div>
  );
};

export default HealthPage;
