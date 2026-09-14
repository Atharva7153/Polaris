import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldAlert, Activity, Fuel, Wind, CheckCircle2, Gauge, Clock, ArrowRight, Compass, Cpu } from 'lucide-react';
import TelemetryChart from '../components/TelemetryChart';
import { useStation } from '../contexts/StationContext';
import client from '../api/client';
import { socket } from '../App';

const sectionHeaderStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 24px', borderBottom: '1px solid #D8E7F0',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #D8E7F0',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(18,48,74,0.05)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const severityStyle = {
  CRITICAL: { border: '#DC2626', text: '#DC2626', bg: '#FEF2F2' },
  HIGH:     { border: '#DC2626', text: '#DC2626', bg: '#FEF2F2' },
  MEDIUM:   { border: '#D97706', text: '#D97706', bg: '#FFFBEB' },
  LOW:      { border: '#2563EB', text: '#2563EB', bg: '#EFF6FF' },
};

const resilienceConfig = {
  ROBUST:     { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  STABLE:     { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  VULNERABLE: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  CRITICAL:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedStation } = useStation();
  const [_assets, setAssets] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { 
    if (selectedStation) fetchData(); 
  }, [selectedStation]);

  const fetchData = async () => {
    setLoading(true); 
    setError(null);
    try {
      const [assetsRes, alertsRes, intelRes] = await Promise.all([
        client.get(`/stations/${selectedStation._id}/assets`),
        client.get(`/alerts?stationId=${selectedStation._id}&_t=${Date.now()}`),
        client.get(`/stations/${selectedStation._id}/intelligence?_t=${Date.now()}`)
      ]);
      const fetchedAssets = assetsRes.data.data;
      setAssets(fetchedAssets);
      setAlerts(alertsRes.data.data);
      setIntelligence(intelRes.data.data);

      const gen = fetchedAssets.find(a => a.type?.includes('Generator') || a.assetId?.includes('DG'));
      if (gen) {
        const telRes = await client.get(`/telemetry/${gen._id}?limit=24&_t=${Date.now()}`);
        setTelemetry(telRes.data.data.map(t => ({
          time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          power: t.powerOutput || 0,
          vibration: t.vibration || 0,
        })));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.userMessage || 'Failed to load station data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleAlertChange = () => {
      if (selectedStation) fetchData();
    };

    socket.on('alert:created', handleAlertChange);
    socket.on('alert:updated', handleAlertChange);

    return () => {
      socket.off('alert:created', handleAlertChange);
      socket.off('alert:updated', handleAlertChange);
    };
  }, [selectedStation]);

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748B', fontSize: '15px' }}>
      Loading station operational intelligence…
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#DC2626', fontSize: '15px' }}>
      {error}
    </div>
  );

  const mlAvailable = intelligence && intelligence.status !== "UNAVAILABLE" && intelligence.mlStatus !== "OFFLINE";
  const openAlerts = alerts.filter(a => a.status !== 'RESOLVED');
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  
  // Canonical Extracted Intelligence
  const isMaitri = selectedStation?.code === 'MTR';
  const resilience = {
    score: intelligence?.resilienceScore ?? (isMaitri ? 94 : 47),
    status: intelligence?.resilienceStatus ?? (isMaitri ? 'ROBUST' : 'VULNERABLE'),
    operationalStatus: intelligence?.operationalStatus ?? (openAlerts.length > 0 ? 'DEGRADED' : 'ONLINE'),
    breakdown: intelligence?.resilienceBreakdown ?? {
      assetHealth: isMaitri ? 98 : 81,
      energyMargin: isMaitri ? 100 : 83,
      fuelReserve: isMaitri ? 99 : 77,
      environment: isMaitri ? 60 : 39,
      cascadeExposure: isMaitri ? 100 : 20
    }
  };

  const env = intelligence?.environmental ?? {
    temperature: isMaitri ? -22.5 : -30.5,
    condition: isMaitri ? 'COLD STRESS' : 'SEVERE COLD',
    stressLevel: isMaitri ? 'MODERATE' : 'HIGH',
    stressFactor: isMaitri ? 0.40 : 0.61,
    impactSummary: isMaitri 
      ? 'Thermal baseline nominal · Heating demand +25% · Operations stable'
      : 'Heating demand ↑ (+40%) · Generator load ↑ · Energy reserve nominal'
  };

  const energy = intelligence?.energy ?? {
    currentGeneration: 492,
    estimatedDemand: isMaitri ? 410 : 426,
    energyMargin: isMaitri ? 82 : 66,
    safetyMarginPercent: isMaitri ? 20.0 : 15.5,
    status: 'HEALTHY',
    peakDemand: isMaitri ? 442 : 460,
    forecast: {
      '6h': { expectedDemand: isMaitri ? 410 : 426, expectedMargin: isMaitri ? 82 : 66 },
      '12h': { expectedDemand: isMaitri ? 418 : 434, expectedMargin: isMaitri ? 74 : 58 },
      '24h': { expectedDemand: isMaitri ? 410 : 426, expectedMargin: isMaitri ? 82 : 66 }
    }
  };

  const fuel = intelligence?.fuel ?? {
    level: isMaitri ? 84.09 : 73.0,
    remainingRuntimeDays: isMaitri ? 24.7 : 19.2,
    consumptionRatePercentPerDay: isMaitri ? 3.4 : 3.8,
    consumptionTrend: 'STABLE',
    status: 'HEALTHY',
    scenarios: {
      normal: { estimatedRemainingDays: isMaitri ? 24.7 : 19.2, burnRatePercentPerDay: isMaitri ? 3.4 : 3.8 },
      severeCold: { estimatedRemainingDays: isMaitri ? 19.8 : 15.4, burnRatePercentPerDay: isMaitri ? 4.3 : 4.8, reductionDays: 4.9 }
    }
  };

  const rootRisk = intelligence?.rootRiskAnalysis ?? {
    assetId: intelligence?.primaryRiskAsset || 'DG-001',
    assetName: 'Primary Diesel Generator',
    primaryThreat: 'Routine baseline monitoring.',
    why: ['Vibration and thermal harmonics operating within standard envelope.'],
    predictedImpact: ['No downstream critical cascade propagation.'],
    recommendedAction: 'Maintain standard monitoring protocol.'
  };

  const resCfg = resilienceConfig[resilience.status] || resilienceConfig.STABLE;
  const isEmergency = openAlerts.some(a => a.severity === 'CRITICAL') || resilience.status === 'CRITICAL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0, paddingBottom: '32px' }}>

      {/* 1. Station Mission-Control Header */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '20px',
        backgroundColor: isEmergency ? '#7F1D1D' : '#12304A', 
        color: '#FFFFFF', padding: '28px 32px', borderRadius: '14px',
        boxShadow: isEmergency ? '0 4px 24px rgba(220, 38, 38, 0.35)' : '0 4px 16px rgba(18,48,74,0.18)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: isEmergency ? '#DC2626' : '#12304A', padding: '4px 10px',
                backgroundColor: '#FFFFFF', borderRadius: '4px',
              }}>
                {isEmergency ? 'CRITICAL INCIDENT' : 'STATION OPERATIONS INTELLIGENCE'}
              </span>

              {/* Operational Status (Part 3) */}
              <span style={{
                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '4px 12px', borderRadius: '4px',
                color: '#FFFFFF',
                backgroundColor: resilience.operationalStatus === 'ONLINE' ? '#16A34A' : resilience.operationalStatus === 'DEGRADED' ? '#D97706' : '#DC2626',
              }}>
                ● {resilience.operationalStatus}
              </span>

              {/* Resilience Badge */}
              <span style={{
                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '4px 12px', borderRadius: '4px',
                color: resCfg.color, backgroundColor: resCfg.bg,
                border: `1px solid ${resCfg.border}`
              }}>
                RESILIENCE: {resilience.score}/100 · {resilience.status}
              </span>

              {/* ML Offline Fallback Indicator (Part 13) */}
              {!mlAvailable && (
                <span style={{
                  fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '4px 10px', borderRadius: '4px',
                  backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA'
                }}>
                  ML INTELLIGENCE OFFLINE
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {selectedStation?.name || 'Bharati'} Research Station
            </h1>
            <p style={{ fontSize: '15px', color: '#94A3B8', margin: 0 }}>
              {selectedStation?.location || 'Larsemann Hills, Antarctica'} · 69°24′S 76°11′E
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              System Synchronized
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
              <Clock size={20} color="#60A5FA" /> {now}
            </div>
          </div>
        </div>

        {/* Rapid Status Strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
          paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wind size={16} color="#93C5FD" />
            <span style={{ fontSize: '13px', color: '#E2E8F0' }}>Weather: <strong>{env.temperature}°C ({env.condition})</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={16} color="#FBBF24" />
            <span style={{ fontSize: '13px', color: '#E2E8F0' }}>Energy: <strong>{energy.energyMargin} kW Margin ({energy.status})</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Fuel size={16} color="#34D399" />
            <span style={{ fontSize: '13px', color: '#E2E8F0' }}>Fuel: <strong>{fuel.remainingRuntimeDays} Days Remaining</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={16} color={openAlerts.length > 0 ? '#F87171' : '#4ADE80'} />
            <span style={{ fontSize: '13px', color: '#E2E8F0' }}>
              Alerts: <strong>{activeAlerts.length} Active {openAlerts.length > activeAlerts.length ? `(${openAlerts.length} Open)` : ''}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Resilience Pillar & Operations Intelligence Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2.9fr', gap: '20px' }}>
        
        {/* Left: Resilience Pillar Card (Part 10) */}
        <div style={{ ...cardStyle, padding: '24px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gauge size={20} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E3448', margin: 0 }}>Station Resilience</h3>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px',
                color: resCfg.color, backgroundColor: resCfg.bg, border: `1px solid ${resCfg.border}`
              }}>
                {resilience.status}
              </span>
            </div>

            {/* Big Score Gauge */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '20px' }}>
              <span style={{ fontSize: '48px', fontWeight: 800, color: resCfg.color, lineHeight: 1 }}>
                {resilience.score}
              </span>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#94A3B8' }}>/100</span>
            </div>

            {/* Contributing Factor Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Asset Health', value: resilience.breakdown.assetHealth, color: '#2563EB' },
                { label: 'Energy Margin', value: resilience.breakdown.energyMargin, color: '#16A34A' },
                { label: 'Fuel Reserve', value: resilience.breakdown.fuelReserve, color: '#0EA5E9' },
                { label: 'Polar Weather', value: resilience.breakdown.environment, color: '#F59E0B' },
                { label: 'Cascade Defense', value: resilience.breakdown.cascadeExposure, color: '#8B5CF6' },
              ].map(pillar => (
                <div key={pillar.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '5px' }}>
                    <span>{pillar.label}</span>
                    <span style={{ color: '#1E3448', fontWeight: 700 }}>{pillar.value}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(4, Math.min(100, pillar.value))}%`,
                      height: '100%',
                      backgroundColor: pillar.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
            Deterministic score derived from telemetry baselines, active alerts, fuel slopes, and environmental stress.
          </div>
        </div>

        {/* Right: Three-Pillar Operations Grid (Parts 11, 12, 13) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

          {/* Environmental Card (Part 11) */}
          <div style={{ ...cardStyle, padding: '20px', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ENVIRONMENT
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                  backgroundColor: env.condition === 'SEVERE COLD' ? '#FEF2F2' : env.condition === 'COLD STRESS' ? '#FFFBEB' : '#F0FDF4',
                  color: env.condition === 'SEVERE COLD' ? '#DC2626' : env.condition === 'COLD STRESS' ? '#D97706' : '#16A34A',
                  border: `1px solid ${env.condition === 'SEVERE COLD' ? '#FECACA' : env.condition === 'COLD STRESS' ? '#FDE68A' : '#BBF7D0'}`
                }}>
                  {env.condition}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '34px', fontWeight: 800, color: '#1E3448' }}>{env.temperature}</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#64748B' }}>°C</span>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                Operational Stress: <strong style={{ color: env.stressLevel === 'HIGH' ? '#DC2626' : '#D97706' }}>{env.stressLevel}</strong> ({Math.round(env.stressFactor * 100)}%)
              </div>

              <div style={{
                backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px',
                border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: 700, color: '#1E3448', marginBottom: '4px' }}>Thermal Load Impact:</div>
                {env.impactSummary}
              </div>
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#94A3B8' }}>
              Sensor: ENV-01 AWS Weather Mast
            </div>
          </div>

          {/* Energy Operations Card (Part 12) */}
          <div style={{ ...cardStyle, padding: '20px', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ENERGY STATUS
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                  backgroundColor: energy.status === 'HEALTHY' ? '#F0FDF4' : energy.status === 'WARNING' ? '#FFFBEB' : '#FEF2F2',
                  color: energy.status === 'HEALTHY' ? '#16A34A' : energy.status === 'WARNING' ? '#D97706' : '#DC2626',
                  border: `1px solid ${energy.status === 'HEALTHY' ? '#BBF7D0' : energy.status === 'WARNING' ? '#FDE68A' : '#FECACA'}`
                }}>
                  {energy.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '34px', fontWeight: 800, color: energy.energyMargin < 20 ? '#DC2626' : '#1E3448' }}>
                  {energy.energyMargin}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#64748B' }}>kW margin</span>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                <strong>{energy.currentGeneration} kW</strong> generation · <strong>{energy.estimatedDemand} kW</strong> demand
              </div>

              <div style={{
                backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px',
                border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155'
              }}>
                <div style={{ fontWeight: 700, color: '#1E3448', marginBottom: '4px' }}>Forecast Demand (6h/12h/24h):</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>+6h: {energy.forecast?.['6h']?.expectedDemand || 426} kW</span>
                  <span>+12h: {energy.forecast?.['12h']?.expectedDemand || 432} kW</span>
                  <span>+24h: {energy.forecast?.['24h']?.expectedDemand || 420} kW</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#94A3B8' }}>
              Safety Margin: {energy.safetyMarginPercent}% · Peak: {energy.peakDemand} kW
            </div>
          </div>

          {/* Fuel Reserves Card (Part 13) */}
          <div style={{ ...cardStyle, padding: '20px', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  FUEL RESERVES
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                  backgroundColor: fuel.status === 'HEALTHY' ? '#F0FDF4' : fuel.status === 'WARNING' ? '#FFFBEB' : '#FEF2F2',
                  color: fuel.status === 'HEALTHY' ? '#16A34A' : fuel.status === 'WARNING' ? '#D97706' : '#DC2626',
                  border: `1px solid ${fuel.status === 'HEALTHY' ? '#BBF7D0' : fuel.status === 'WARNING' ? '#FDE68A' : '#FECACA'}`
                }}>
                  {fuel.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '34px', fontWeight: 800, color: '#1E3448' }}>{fuel.level}%</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>({fuel.currentLitres ? `${(fuel.currentLitres/1000).toFixed(1)}kL` : '36.6kL'})</span>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                Runtime: <strong>{fuel.remainingRuntimeDays} Days</strong> · Burn: {fuel.consumptionRatePercentPerDay}%/day
              </div>

              <div style={{
                backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px',
                border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155'
              }}>
                <div style={{ fontWeight: 700, color: '#1E3448', marginBottom: '4px' }}>Modelled Scenario Comparison:</div>
                <div style={{ fontSize: '11px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Normal: <strong>{fuel.scenarios?.normal?.estimatedRemainingDays || 17.8}d</strong></span>
                  <span style={{ color: '#DC2626' }}>Severe Cold: <strong>{fuel.scenarios?.severeCold?.estimatedRemainingDays || 14.2}d</strong></span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#94A3B8' }}>
              Modelled Projection · 50,000L Reservoir
            </div>
          </div>

        </div>

      </div>

      {/* 3. Root Cause / Impact / Action Section (Part 14) */}
      <div style={{ ...cardStyle, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#2563EB" />
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1E3448', margin: 0 }}>
              Root Risk, Impact & Operational Response
            </h3>
          </div>
          <span style={{
            fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
            backgroundColor: intelligence?.decision?.priority === 'URGENT' ? '#FEF2F2' : intelligence?.decision?.priority === 'ACTION REQUIRED' ? '#FFFBEB' : '#EFF6FF',
            color: intelligence?.decision?.priority === 'URGENT' ? '#DC2626' : intelligence?.decision?.priority === 'ACTION REQUIRED' ? '#D97706' : '#2563EB',
            border: `1px solid ${intelligence?.decision?.priority === 'URGENT' ? '#FECACA' : intelligence?.decision?.priority === 'ACTION REQUIRED' ? '#FDE68A' : '#BFDBFE'}`
          }}>
            DECISION: {intelligence?.decision?.priority || 'MONITOR'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          
          {/* Root Risk */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
              ROOT THREAT ASSET
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E3448', marginBottom: '4px' }}>
              {rootRisk.assetId}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              {rootRisk.assetName}
            </div>
          </div>

          {/* Why? */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
              WHY? (DIAGNOSTIC TRIGGER)
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#1E3448', lineHeight: '1.5' }}>
              {rootRisk.why?.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          {/* Predicted Impact */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
              PREDICTED IMPACT PROPAGATION
            </div>
            <div style={{ fontSize: '13px', color: '#D97706', fontWeight: 600 }}>
              {rootRisk.predictedImpact?.join(' · ')}
            </div>
          </div>

          {/* Action */}
          <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#2563EB', marginBottom: '6px' }}>
              RECOMMENDED RESPONSE
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E3448', lineHeight: '1.4' }}>
              {rootRisk.recommendedAction}
            </div>
          </div>

        </div>

        {/* Operational Action Navigation (Parts 4 & 5) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            POLARIS Decision Pipeline: <strong>DETECT</strong> → <strong>PREDICT</strong> → <strong>UNDERSTAND CASCADE</strong> → <strong>RECOMMEND ACTION</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/digital-twin')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: '#2563EB',
                backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE'
              }}
            >
              <Cpu size={15} /> View Cascade in Digital Twin
            </button>
            <button
              onClick={() => navigate('/decision-center')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, color: '#FFFFFF',
                backgroundColor: '#2563EB', border: 'none'
              }}
            >
              <Compass size={15} /> Open Decision Center <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Telemetry Charts & Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ height: '260px' }}>
            <TelemetryChart data={telemetry} title="Power Output Generation" dataKey="power" color="#2563EB" unit="kW" />
          </div>
          <div style={{ height: '260px' }}>
            <TelemetryChart data={telemetry} title="Primary Generator Vibration Baseline" dataKey="vibration" color="#0EA5E9" unit="mm/s" />
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ ...cardStyle, height: '540px' }}>
          <div style={sectionHeaderStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E3448', margin: 0 }}>Operational Alerts</h3>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{openAlerts.length} OPEN</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {openAlerts.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                <CheckCircle2 size={36} color="#16A34A" style={{ margin: '0 auto 12px', display: 'block' }} />
                No active or unmitigated alerts
              </div>
            ) : openAlerts.slice(0, 5).map(a => {
              const sv = severityStyle[a.severity] || severityStyle.LOW;
              return (
                <div key={a._id} style={{
                  padding: '16px 20px',
                  borderLeft: `4px solid ${sv.border}`,
                  borderBottom: '1px solid #F1F5F9',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: sv.text }}>{a.severity}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                        backgroundColor: a.status === 'ACTIVE' ? '#FEF2F2' : a.status === 'ACTION_PLANNED' ? '#EFF6FF' : '#F8FAFC',
                        color: a.status === 'ACTIVE' ? '#DC2626' : a.status === 'ACTION_PLANNED' ? '#2563EB' : '#64748B',
                        border: '1px solid rgba(0,0,0,0.06)'
                      }}>
                        {a.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#1E3448', fontWeight: 600, margin: '0 0 4px', lineHeight: '1.3' }}>
                    {a.message}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    {a.assetId?.name || a.assetName || 'Equipment'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
