import React, { useEffect, useState } from 'react';
import { HeartPulse, RefreshCw, Watch } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getGoogleFitActivity, startGoogleFitConnect, syncGoogleFitActivity } from '../../services/googleFitService';

const ActivityMetric = ({ label, value, unit }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-2">{label}</div>
    <div className="text-2xl font-black">
      {value}
      <span className="text-sm text-white/40 font-medium ml-2">{unit}</span>
    </div>
  </div>
);

const formatLastSync = (dateString) => {
  if (!dateString) return 'Not synced';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Not synced';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'Unavailable';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const sortActivityRows = (rows = []) =>
  [...rows].sort((a, b) => String(b.activity_date || '').localeCompare(String(a.activity_date || '')));

const getTodayActivity = (rows = []) => {
  const today = new Date().toLocaleDateString('en-CA');
  return rows.find((row) => row.activity_date === today) || rows[0] || null;
};

const HealthDataPanel = ({ showHeader = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activityRows, setActivityRows] = useState([]);
  const [activityMeta, setActivityMeta] = useState({ days: 7, live: false, timezone: '' });
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  const latestActivity = getTodayActivity(activityRows);
  const fitStatus = latestActivity ? 'Connected' : 'Not connected';

  const loadActivity = async () => {
    try {
      const payload = await getGoogleFitActivity(7);
      setActivityRows(sortActivityRows(payload.items || []));
      setActivityMeta({
        days: payload.days || 7,
        live: Boolean(payload.live),
        timezone: payload.timezone || '',
        startDate: payload.startDate || '',
        endDate: payload.endDate || '',
      });
    } catch (error) {
      setActivityRows([]);
      setActivityMeta({ days: 7, live: false, timezone: '' });
      setSyncError(error.message);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fitState = params.get('googleFit');
    const reason = params.get('reason');

    if (fitState === 'connected') {
      setSyncMessage('Google Fit connected. Run a sync to store activity.');
      setSyncError('');
      void loadActivity();
      navigate(location.pathname, { replace: true });
    } else if (fitState === 'error') {
      setSyncError(reason || 'Google Fit connection failed.');
      setSyncMessage('');
      navigate(location.pathname, { replace: true });
    } else {
      void loadActivity();
    }
  }, [location.pathname, location.search, navigate]);

  const handleConnectGoogleFit = async () => {
    setIsConnecting(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const authUrl = await startGoogleFitConnect();
      window.location.assign(authUrl);
    } catch (error) {
      setSyncError(error.message);
      setIsConnecting(false);
    }
  };

  const handleSyncGoogleFit = async () => {
    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const payload = await syncGoogleFitActivity(7);
      setActivityRows(sortActivityRows(payload.items || []));
      setActivityMeta({
        days: payload.daysSynced || 7,
        live: true,
        timezone: payload.items?.[0]?.timezone || '',
        startDate: payload.items?.[payload.items.length - 1]?.activity_date || '',
        endDate: payload.items?.[0]?.activity_date || '',
      });
      setSyncMessage(`Stored ${payload.daysSynced || 0} day(s) of Google Fit activity.`);
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section>
      {showHeader ? (
        <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 px-2">Health Data</h2>
      ) : null}
      <div className="bg-linear-to-br from-white/8 to-white/0 border border-white/10 rounded-[2rem] p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
                <Watch className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-lg">Google Fit</div>
                <div className="text-sm text-white/50">Steps, calories, distance, heart rate</div>
              </div>
            </div>
            <div className="text-sm text-white/60">Status: {fitStatus}</div>
            <div className="text-sm text-white/40">Last sync: {formatLastSync(latestActivity?.updated_at)}</div>
          </div>
          <div className="flex flex-col gap-3 min-w-[150px]">
            <button
              onClick={handleConnectGoogleFit}
              disabled={isConnecting}
              className="px-4 py-3 rounded-xl bg-white text-black font-bold hover:opacity-90 disabled:opacity-70"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
            <button
              onClick={handleSyncGoogleFit}
              disabled={isSyncing}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 font-bold hover:bg-white/15 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {syncMessage ? <div className="text-sm text-emerald-300">{syncMessage}</div> : null}
        {syncError ? <div className="text-sm text-rose-300">{syncError}</div> : null}

        {latestActivity ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ActivityMetric label="Steps" value={latestActivity.steps || 0} unit="steps" />
              <ActivityMetric label="Calories" value={Math.round(latestActivity.calories_burned || 0)} unit="kcal" />
              <ActivityMetric label="Distance" value={(Number(latestActivity.distance_meters || 0) / 1000).toFixed(2)} unit="km" />
              <ActivityMetric label="Heart Rate" value={latestActivity.avg_heart_rate ? Math.round(latestActivity.avg_heart_rate) : '--'} unit="bpm avg" />
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-bold text-white/80">Google Fit debug</div>
                <div className="text-xs text-white/45">
                  {activityMeta.live ? 'Live fetch' : 'Cached'} · {activityMeta.timezone || 'Unknown timezone'}
                </div>
              </div>
              <div className="grid gap-2 text-sm text-white/60">
                <div className="flex items-center justify-between gap-4">
                  <span>Card date</span>
                  <span>{latestActivity.activity_date || 'Unavailable'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Bucket window</span>
                  <span>{formatDateTime(latestActivity.bucket_start_local)} to {formatDateTime(latestActivity.bucket_end_local)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Returned range</span>
                  <span>{activityMeta.startDate || 'Unavailable'} to {activityMeta.endDate || 'Unavailable'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Source count</span>
                  <span>{latestActivity.data_source_ids?.length || 0}</span>
                </div>
              </div>
              {latestActivity.data_source_ids?.length ? (
                <div className="text-xs text-white/40 break-all">
                  Sources: {latestActivity.data_source_ids.join(' | ')}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">
            Connect Google Fit, then run a sync to store activity in the backend database.
          </div>
        )}

        {activityRows.length > 0 ? (
          <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-3 text-white/70 font-bold">
              <HeartPulse className="w-4 h-4" />
              <span>Recent activity window</span>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              {activityRows.slice(0, 3).map((row) => (
                <div key={row.activity_date} className="flex items-center justify-between">
                  <span>{row.activity_date}</span>
                  <span>{row.steps || 0} steps</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default HealthDataPanel;
