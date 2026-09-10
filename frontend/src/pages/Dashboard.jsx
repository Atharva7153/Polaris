import { useState, useEffect } from 'react';
import { Thermometer, Zap, Box, ShieldAlert, Activity } from 'lucide-react';
import StatusCard from '../components/StatusCard';
import TelemetryChart from '../components/TelemetryChart';
import { useStation } from '../contexts/StationContext';
import client from '../api/client';

const sectionHeaderStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 24px', borderBottom: '1px solid #D8E7F0',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #D8E7F0',
  borderRadius: '10px',
  boxShadow: '0 1px 3px rgba(18,48,74,0.06)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const severityStyle = {
  CRITICAL: { border: '#DC2626', text: '#DC2626' },
  HIGH:     { border: '#DC2626', text: '#DC2626' },
  MEDIUM:   { border: '#D97706', text: '#D97706' },
  LOW:      { border: '#2563EB', text: '#2563EB' },
};

export default function Dashboard() {
  const { selectedStation } = useStation();
  const [assets, setAssets] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { if (selectedStation) fetchData(); }, [selectedStation]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [assetsRes, alertsRes, intelRes] = await Promise.all([
        client.get(`/stations/${selectedStation._id}/assets`),
        client.get(`/alerts?stationId=${selectedStation._id}&status=ACTIVE&_t=${Date.now()}`),
        client.get(`/stations/${selectedStation._id}/intelligence`)
      ]);
      const fetchedAssets = assetsRes.data.data;
      setAssets(fetchedAssets);
      setAlerts(alertsRes.data.data);
      setIntelligence(intelRes.data.data);

      const gen = fetchedAssets.find(a => a.type?.includes('Generator') || a.assetId?.includes('DG'));
      if (gen) {
        const telRes = await client.get(`/telemetry/${gen._id}?limit=24`);
        setTelemetry(telRes.data.data.map(t => ({
          time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          power: t.powerOutput || 0,
          vibration: t.vibration || 0,
        })));
      }
    } catch {
      setError('Failed to load station data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleAlertChange = () => {
      if (selectedStation) fetchData(); // Refetch to update counts and intelligence
    };

    import('../App').then(({ socket }) => {
      socket.on('alert:created', handleAlertChange);
      socket.on('alert:updated', handleAlertChange);
    });

    return () => {
      import('../App').then(({ socket }) => {
        socket.off('alert:created', handleAlertChange);
        socket.off('alert:updated', handleAlertChange);
      });
    };
  }, [selectedStation]);

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748B', fontSize: '15px' }}>
      Loading station data…
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#DC2626', fontSize: '15px' }}>
      {error}
    </div>
  );

  const mlAvailable = intelligence && intelligence.status !== "UNAVAILABLE";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', minWidth: 0 }}>

      {/* Station Header */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: alerts.length > 0 ? '#7F1D1D' : '#12304A', color: '#FFFFFF', padding: '32px', borderRadius: '12px',
        boxShadow: alerts.length > 0 ? '0 4px 20px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(18,48,74,0.15)',
        transition: 'all 0.3s ease'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: alerts.length > 0 ? '#DC2626' : '#12304A', padding: '4px 12px',
              backgroundColor: '#FFFFFF', borderRadius: '4px',
            }}>
              {alerts.length > 0 ? 'CRITICAL INCIDENT' : 'OPERATIONAL CONSOLE'}
            </span>
            <span style={{
              fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '4px 12px', borderRadius: '4px',
              color: '#FFFFFF',
              backgroundColor: selectedStation?.status === 'OPERATIONAL' ? '#16A34A' : '#D97706',
            }}>
              ● {selectedStation?.status}
            </span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            {selectedStation?.name} Research Station
          </h1>
          <p style={{ fontSize: '18px', color: '#94A3B8', margin: 0 }}>
            {selectedStation?.location || 'Larsemann Hills, Antarctica'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Last Synchronized</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>{now}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '20px' }}>
        <StatusCard title="Ext. Temperature" value="-14.2" unit="°C"  icon={Thermometer} color="blue" />
        <StatusCard title="Power Output"     value={telemetry.at(-1)?.power?.toFixed(0) ?? '--'} unit="kW" icon={Zap} color="green" />
        <StatusCard title="Active Assets"    value={assets.length} icon={Box} color="blue" />
        <StatusCard
          title="Active Alerts"
          value={alerts.length}
          icon={ShieldAlert}
          color={alerts.length > 2 ? 'red' : alerts.length > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Charts + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

        {/* Power Chart */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ height: '260px' }}>
              <TelemetryChart data={telemetry} title="Power Output" dataKey="power" color="#2563EB" unit="kW" />
            </div>
            <div style={{ height: '260px' }}>
              <TelemetryChart data={telemetry} title="Vibration" dataKey="vibration" color="#0EA5E9" unit="mm/s" />
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{...cardStyle, flex: 1}}>
            <div style={sectionHeaderStyle}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E3448', margin: 0 }}>Recent Alerts</h3>
                <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>{alerts.length} ACTIVE</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No active alerts
                </div>
                ) : alerts.slice(0, 5).map(a => {
                const sv = severityStyle[a.severity] || severityStyle.LOW;
                return (
                    <div key={a._id} style={{
                    padding: '16px 24px',
                    borderLeft: `4px solid ${sv.border}`,
                    borderBottom: '1px solid #F1F5F9',
                    }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: sv.text, marginBottom: '6px' }}>{a.severity}</div>
                    <p style={{ fontSize: '15px', color: '#1E3448', fontWeight: 600, margin: '0 0 6px', lineHeight: '1.4' }}>
                        {a.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500 }}>
                        {a.assetId?.name || 'Unknown'}
                        </p>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                        {new Date(a.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                    </div>
                );
                })}
            </div>
            </div>
        </div>
      </div>

      {/* ML Station Health Summary */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#2563EB" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E3448', margin: 0 }}>Station Intelligence</h3>
          </div>
          {!mlAvailable && <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, backgroundColor: '#FEF2F2', padding: '4px 8px', borderRadius: '4px' }}>ML OFFLINE</span>}
        </div>
        
        {mlAvailable ? (
          <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1, backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '20px', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#2563EB', marginBottom: '8px' }}>Station Risk</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: severityStyle[intelligence.stationRisk?.level]?.text || '#12304A' }}>
                    {intelligence.stationRisk?.level || 'UNKNOWN'}
                </div>
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #D8E7F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>Primary Risk Asset</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E3448' }}>
                    {intelligence.primaryRiskAsset || 'None'}
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #D8E7F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>Cascade Impact</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1E3448' }}>
                    {intelligence.cascadeImpact?.length > 0 ? intelligence.cascadeImpact.join(', ') : 'None detected'}
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #D8E7F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>Decision Priority</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E3448' }}>
                    {intelligence.decision?.priority || 'MONITOR'}
                </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            Station telemetry is available, but predictive intelligence is temporarily unavailable.
          </div>
        )}
      </div>

    </div>
  );
}
