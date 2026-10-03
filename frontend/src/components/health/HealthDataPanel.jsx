import React, { useEffect, useState } from 'react';
import {
  HeartPulse,
  Moon,
  RefreshCw,
  Watch,
  CheckCircle2,
  Flame,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Calendar,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGoogleFitActivity, startGoogleFitConnect, syncGoogleFitActivity } from '../../services/googleFitService';
import { getFitbitActivity, startFitbitConnect, syncFitbitActivity } from '../../services/fitbitService';

const ActivityMetric = ({ label, value, unit, icon }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
    {icon && (
      <div className="p-2.5 rounded-xl bg-white/5 text-amber-400 border border-white/5">
        {icon}
      </div>
    )}
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{label}</div>
      <div className="text-2xl font-black font-mono">
        {value}
        <span className="text-xs text-white/40 font-medium ml-1.5">{unit}</span>
      </div>
    </div>
  </div>
);

const formatLastSync = (dateString) => {
  if (!dateString) return 'Not synced';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Not synced';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const sortActivityRows = (rows = []) =>
  [...rows].sort((a, b) => String(b.activity_date || '').localeCompare(String(a.activity_date || '')));

const getTodayActivity = (rows = []) => {
  const today = new Date().toLocaleDateString('en-CA');
  return rows.find((row) => row.activity_date === today) || rows[0] || null;
};

const formatDayLabel = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  if (date.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA')) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toLocaleDateString('en-CA') === yesterday.toLocaleDateString('en-CA')) return 'Yest';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const HealthDataPanel = ({ showHeader = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('fitbit'); // 'fitbit' | 'googleFit'
  const [chartMetric, setChartMetric] = useState('steps'); // 'steps' | 'calories' | 'heart'
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activityRows, setActivityRows] = useState([]);
  const [activityMeta, setActivityMeta] = useState({ days: 7, live: false, timezone: '', source: 'none' });
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  const latestActivity = getTodayActivity(activityRows);
  const isWatchSource = latestActivity?.source === 'fitbit' || latestActivity?.source === 'fitbit_watch';

  const loadActivity = async (preferredSource = activeTab) => {
    try {
      let payload;
      if (preferredSource === 'fitbit') {
        payload = await getFitbitActivity(7).catch(() => null);
      } else {
        payload = await getGoogleFitActivity(7).catch(() => null);
      }

      const rows = sortActivityRows(payload?.items || []);
      setActivityRows(rows);
      setActivityMeta({
        days: payload?.days || 7,
        live: Boolean(payload?.live),
        timezone: payload?.timezone || '',
        startDate: payload?.startDate || '',
        endDate: payload?.endDate || '',
        source: payload?.source || (preferredSource === 'fitbit' ? 'fitbit' : 'google_fit'),
      });
    } catch (error) {
      setActivityRows([]);
      setActivityMeta({ days: 7, live: false, timezone: '', source: 'none' });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fitState = params.get('googleFit') || params.get('fitbit');
    const reason = params.get('reason');

    if (fitState === 'connected') {
      const isFitbit = Boolean(params.get('fitbit'));
      setSyncMessage(isFitbit ? 'Fitbit watch connected! Click Sync Now to pull watch steps.' : 'Google Fit connected successfully.');
      setSyncError('');
      void loadActivity(isFitbit ? 'fitbit' : 'googleFit');
      navigate(location.pathname, { replace: true });
    } else if (fitState === 'error') {
      setSyncError(reason || 'Wearable connection failed.');
      setSyncMessage('');
      navigate(location.pathname, { replace: true });
    } else {
      void loadActivity();
    }
  }, [location.pathname, location.search, navigate]);

  const handleConnectFitbit = async () => {
    setIsConnecting(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const authUrl = await startFitbitConnect();
      window.location.assign(authUrl);
    } catch (error) {
      setSyncError(error.message);
      setIsConnecting(false);
    }
  };

  const handleSyncFitbit = async () => {
    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const payload = await syncFitbitActivity(7);
      const rows = sortActivityRows(payload.items || []);
      setActivityRows(rows);
      setActivityMeta({
        days: payload.daysSynced || 7,
        live: true,
        timezone: '',
        startDate: rows[rows.length - 1]?.activity_date || '',
        endDate: rows[0]?.activity_date || '',
        source: 'fitbit',
      });
      setSyncMessage(`Synced ${payload.daysSynced || 0} day(s) directly from your Fitbit watch.`);
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  };

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
      const rows = sortActivityRows(payload.items || []);
      setActivityRows(rows);
      setActivityMeta({
        days: payload.daysSynced || 7,
        live: true,
        timezone: rows[0]?.timezone || '',
        startDate: rows[rows.length - 1]?.activity_date || '',
        endDate: rows[0]?.activity_date || '',
        source: 'google_fit',
      });
      setSyncMessage(`Synced ${payload.daysSynced || 0} day(s) from Google Fit.`);
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Chronological array for charts (oldest -> newest)
  const chartDays = [...activityRows].reverse();

  // Summary computations
  const totalSteps = activityRows.reduce((sum, r) => sum + (Number(r.steps) || 0), 0);
  const avgSteps = activityRows.length ? Math.round(totalSteps / activityRows.length) : 0;
  const bestDay = activityRows.reduce((best, r) => (!best || (Number(r.steps) || 0) > (Number(best.steps) || 0) ? r : best), null);

  // Maximum scale for chart
  const maxStepVal = Math.max(...chartDays.map(d => Number(d.steps) || 0), 10000);
  const maxCalVal = Math.max(...chartDays.map(d => Number(d.calories_burned) || 0), 2500);
  const maxHrVal = Math.max(...chartDays.map(d => Number(d.avg_heart_rate) || 0), 160);

  return (
    <section className="space-y-6">
      {showHeader ? (
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Wearable & Activity Telemetry</h2>
          {isWatchSource && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Fitbit Watch Active
            </span>
          )}
        </div>
      ) : null}

      {/* Main Container */}
      <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 space-y-6 backdrop-blur-xl shadow-2xl">
        {/* Source Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => { setActiveTab('fitbit'); void loadActivity('fitbit'); }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'fitbit'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Watch className="w-4 h-4" />
            <span>Fitbit Watch (Direct)</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('googleFit'); void loadActivity('googleFit'); }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'googleFit'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Google Fit</span>
          </button>
        </div>

        {/* Active Source Connection Card */}
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <Watch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {activeTab === 'fitbit' ? 'Fitbit Watch Cloud' : 'Google Fit Service'}
                </h3>
                <p className="text-xs text-white/45">
                  {activeTab === 'fitbit'
                    ? 'Reads directly from your Fitbit wrist sensors (steps, HR, sleep)'
                    : 'Reads Google Fit aggregated streams with phone accelerometer filter'}
                </p>
              </div>
            </div>
            <div className="text-xs text-white/50 mt-2">
              Last synced: <span className="text-white/80 font-medium">{formatLastSync(latestActivity?.updated_at)}</span>
            </div>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={activeTab === 'fitbit' ? handleConnectFitbit : handleConnectGoogleFit}
              disabled={isConnecting}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-all disabled:opacity-50"
            >
              {isConnecting ? 'Opening...' : 'Connect'}
            </button>
            <button
              onClick={activeTab === 'fitbit' ? handleSyncFitbit : handleSyncGoogleFit}
              disabled={isSyncing}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {syncMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}
        {syncError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {/* Current Day Metrics Grid */}
        {latestActivity ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ActivityMetric
                label="Today Steps"
                value={latestActivity.steps || 0}
                unit="steps"
                icon={<Watch className="w-4 h-4" />}
              />
              <ActivityMetric
                label="Burned"
                value={Math.round(latestActivity.calories_burned || 0)}
                unit="kcal"
                icon={<Flame className="w-4 h-4" />}
              />
              <ActivityMetric
                label="Heart Rate"
                value={latestActivity.avg_heart_rate ? Math.round(latestActivity.avg_heart_rate) : '--'}
                unit="bpm"
                icon={<HeartPulse className="w-4 h-4" />}
              />
              <ActivityMetric
                label="Sleep"
                value={latestActivity.sleep_minutes ? `${Math.floor(latestActivity.sleep_minutes / 60)}h ${latestActivity.sleep_minutes % 60}m` : '--'}
                unit=""
                icon={<Moon className="w-4 h-4" />}
              />
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 📊 INTERACTIVE HISTORICAL DATA VISUALIZATION                   */}
            {/* ------------------------------------------------------------- */}
            {chartDays.length > 0 && (
              <div className="rounded-3xl bg-black/30 border border-white/10 p-5 sm:p-6 space-y-5">
                {/* Visualization Header & Metric Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <BarChart3 className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Activity Trends</h4>
                      <p className="text-[11px] text-white/40">7-Day historical progression</p>
                    </div>
                  </div>

                  {/* Metric Switcher */}
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setChartMetric('steps')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        chartMetric === 'steps'
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Steps
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('calories')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        chartMetric === 'calories'
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Calories
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('heart')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        chartMetric === 'heart'
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Heart Rate
                    </button>
                  </div>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40 block">Period Total</span>
                    <span className="font-mono text-base sm:text-lg font-black text-amber-400">
                      {chartMetric === 'steps'
                        ? totalSteps.toLocaleString()
                        : `${Math.round(activityRows.reduce((acc, r) => acc + (Number(r.calories_burned) || 0), 0))} kcal`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40 block">Daily Average</span>
                    <span className="font-mono text-base sm:text-lg font-black text-white">
                      {chartMetric === 'steps'
                        ? avgSteps.toLocaleString()
                        : `${Math.round(activityRows.reduce((acc, r) => acc + (Number(r.calories_burned) || 0), 0) / (activityRows.length || 1))} kcal`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40 block">Peak Day</span>
                    <span className="font-mono text-base sm:text-lg font-black text-emerald-400">
                      {chartMetric === 'steps'
                        ? (Number(bestDay?.steps) || 0).toLocaleString()
                        : `${Math.round(Number(bestDay?.calories_burned) || 0)} kcal`}
                    </span>
                  </div>
                </div>

                {/* Animated SVG / HTML Bar Chart */}
                <div className="pt-4">
                  <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 relative">
                    {/* Goal line (at 10,000 steps) */}
                    {chartMetric === 'steps' && maxStepVal >= 10000 && (
                      <div
                        style={{ bottom: `${(10000 / maxStepVal) * 100}%` }}
                        className="absolute left-0 right-0 border-b border-dashed border-amber-400/30 flex justify-end pointer-events-none"
                      >
                        <span className="text-[9px] font-bold text-amber-400/50 uppercase tracking-widest -mt-4 pr-1">
                          10k Goal
                        </span>
                      </div>
                    )}

                    {chartDays.map((day, idx) => {
                      let val = 0;
                      let maxScale = 1;
                      let unit = '';
                      let barColor = 'from-amber-400 to-amber-500';

                      if (chartMetric === 'steps') {
                        val = Number(day.steps) || 0;
                        maxScale = maxStepVal;
                        unit = 'steps';
                        barColor = val >= 10000 ? 'from-emerald-400 to-emerald-500' : 'from-amber-400 to-amber-500';
                      } else if (chartMetric === 'calories') {
                        val = Math.round(Number(day.calories_burned) || 0);
                        maxScale = maxCalVal;
                        unit = 'kcal';
                        barColor = 'from-orange-400 to-rose-500';
                      } else {
                        val = Math.round(Number(day.avg_heart_rate) || 0);
                        maxScale = maxHrVal;
                        unit = 'bpm';
                        barColor = 'from-rose-500 to-pink-500';
                      }

                      const pctHeight = Math.max(8, Math.min(100, Math.round((val / maxScale) * 100)));
                      const isHovered = hoveredDay === day.activity_date;
                      const isToday = day.activity_date === new Date().toLocaleDateString('en-CA');

                      return (
                        <div
                          key={day.activity_date || idx}
                          onMouseEnter={() => setHoveredDay(day.activity_date)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        >
                          {/* Floating Tooltip on Hover */}
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute -top-12 z-30 bg-black/90 border border-white/20 px-2.5 py-1 rounded-xl text-center shadow-xl pointer-events-none whitespace-nowrap"
                            >
                              <div className="font-mono font-bold text-xs text-white">{val} {unit}</div>
                              <div className="text-[9px] text-white/50">{day.activity_date}</div>
                            </motion.div>
                          )}

                          {/* Top Value Label */}
                          <span className={`text-[10px] font-mono font-bold mb-1.5 transition-colors ${
                            isHovered || isToday ? 'text-amber-400' : 'text-white/40'
                          }`}>
                            {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                          </span>

                          {/* Bar */}
                          <div className="w-full max-w-[28px] h-32 bg-white/5 rounded-2xl relative overflow-hidden flex items-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${pctHeight}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.05 }}
                              className={`w-full rounded-2xl bg-gradient-to-t ${barColor} shadow-lg ${
                                isToday ? 'ring-2 ring-white/50' : ''
                              }`}
                            />
                          </div>

                          {/* Day Label */}
                          <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${
                            isToday ? 'text-amber-400 font-black' : 'text-white/50'
                          }`}>
                            {formatDayLabel(day.activity_date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 📋 PREVIOUS DATA TABLE / LOG ENTRIES                           */}
            {/* ------------------------------------------------------------- */}
            <div className="rounded-3xl bg-black/20 border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/50" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Daily Activity Records ({activityRows.length} Days)
                  </span>
                </div>
                {activityRows.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <span>{showFullHistory ? 'Show Less' : 'View All'}</span>
                    {showFullHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="divide-y divide-white/5">
                {(showFullHistory ? activityRows : activityRows.slice(0, 4)).map((row) => {
                  const stepCount = Number(row.steps) || 0;
                  const stepGoalPercent = Math.min(100, Math.round((stepCount / 10000) * 100));
                  const isDayToday = row.activity_date === new Date().toLocaleDateString('en-CA');

                  return (
                    <div
                      key={row.activity_date}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-[110px]">
                        <div className={`w-2.5 h-2.5 rounded-full ${isDayToday ? 'bg-amber-400' : 'bg-white/20'}`} />
                        <div>
                          <div className="font-bold text-xs text-white">
                            {formatDayLabel(row.activity_date)}
                            {isDayToday && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 font-black">TODAY</span>}
                          </div>
                          <div className="text-[10px] text-white/40 font-mono">{row.activity_date}</div>
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="flex-1 max-w-[120px] hidden sm:block">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${stepGoalPercent}%` }}
                            className={`h-full rounded-full ${stepCount >= 10000 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          />
                        </div>
                      </div>

                      {/* Values */}
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-mono font-bold text-xs text-white">{stepCount.toLocaleString()}</div>
                          <div className="text-[10px] text-white/40">steps</div>
                        </div>
                        <div className="hidden xs:block">
                          <div className="font-mono font-bold text-xs text-white/80">{Math.round(row.calories_burned || 0)}</div>
                          <div className="text-[10px] text-white/40">kcal</div>
                        </div>
                        <div>
                          <div className="font-mono font-bold text-xs text-rose-400">
                            {row.avg_heart_rate ? `${Math.round(row.avg_heart_rate)}` : '--'}
                          </div>
                          <div className="text-[10px] text-white/40">bpm</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/45">
            Click <strong>Connect</strong> above to link your Fitbit account and sync watch telemetry.
          </div>
        )}
      </div>
    </section>
  );
};

export default HealthDataPanel;
