import { useState, useEffect } from 'react';
import TelemetryChart from '../components/TelemetryChart';
import client from '../api/client';
import { useStation } from '../contexts/StationContext';
import { Activity, RefreshCw } from 'lucide-react';

const RANGES = [
  { label: '1H',  value: 1  },
  { label: '6H',  value: 6  },
  { label: '12H', value: 12 },
  { label: '24H', value: 24 },
];

const controlBarStyle = {
  display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
  padding: '16px 20px',
  backgroundColor: '#FFFFFF', border: '1px solid #D8E7F0',
  borderRadius: '10px',
  boxShadow: '0 1px 3px rgba(18,48,74,0.06)',
};

export default function Telemetry() {
  const { selectedStation } = useStation();
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [range, setRange] = useState(24);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { if (selectedStation) loadAssets(); }, [selectedStation]);
  useEffect(() => { if (selectedAssetId) loadTelemetry(); }, [selectedAssetId, range]);

  const loadAssets = async () => {
    try {
      const res = await client.get(`/stations/${selectedStation._id}/assets`);
      setAssets(res.data.data);
      if (res.data.data.length > 0) setSelectedAssetId(res.data.data[0]._id);
    } catch {}
  };

  const loadTelemetry = async () => {
    setLoading(true); setError(null);
    try {
      const res = await client.get(`/telemetry/${selectedAssetId}?limit=${range}`);
      setTelemetry(res.data.data.map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        power: t.powerOutput || 0,
        vibration: t.vibration || 0,
        load: t.generatorLoad || 0,
        fuel: t.fuelLevel || 0,
        temp: t.temperature || 0,
        voltage: t.batteryVoltage || 0,
      })));
    } catch {
      setError('Failed to load telemetry.');
    } finally {
      setLoading(false);
    }
  };

  const currentAsset = assets.find(a => a._id === selectedAssetId);
  const isGen = currentAsset?.type?.includes('Generator') || currentAsset?.assetId?.includes('DG');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#12304A', margin: '0 0 6px' }}>
            Telemetry
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>
            Real-time sensor data
          </p>
        </div>
        <button
          onClick={loadTelemetry}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#FFFFFF', border: '1px solid #D8E7F0',
            borderRadius: '10px', fontSize: '15px', color: '#1E3448',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600,
          }}
        >
          <RefreshCw style={{ width: '16px', height: '16px' }} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div style={controlBarStyle}>
        {/* Asset selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>
            Asset
          </label>
          <select
            style={{
              padding: '8px 14px',
              backgroundColor: '#F6FAFD', border: '1px solid #D8E7F0',
              borderRadius: '8px', fontSize: '15px', color: '#1E3448', fontWeight: 500,
              outline: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
            value={selectedAssetId}
            onChange={e => setSelectedAssetId(e.target.value)}
          >
            {assets.map(a => (
              <option key={a._id} value={a._id}>{a.name} ({a.assetId})</option>
            ))}
          </select>
        </div>

        <div style={{ width: '1px', height: '28px', backgroundColor: '#D8E7F0' }} />

        {/* Range selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>
            Range
          </label>
          <div style={{
            display: 'flex', gap: '4px',
            padding: '4px', backgroundColor: '#F6FAFD',
            border: '1px solid #D8E7F0', borderRadius: '8px',
          }}>
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                style={{
                  padding: '6px 14px', borderRadius: '6px',
                  fontSize: '14px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: range === r.value ? '#2563EB' : 'transparent',
                  color: range === r.value ? '#FFFFFF' : '#64748B',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748B' }}>
          <Activity style={{ width: '32px', height: '32px', margin: '0 auto 12px', color: '#2563EB', display: 'block' }} />
          <span style={{ fontSize: '15px' }}>Loading telemetry…</span>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#DC2626', fontSize: '15px' }}>
          {error}
        </div>
      ) : telemetry.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B', fontSize: '15px' }}>
          No telemetry data available.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {telemetry.some(t => t.power > 0) && (
            <div style={{ height: '320px' }}>
              <TelemetryChart data={telemetry} title="Power Output" dataKey="power" color="#2563EB" unit="kW" />
            </div>
          )}
          {telemetry.some(t => t.load > 0) && (
            <div style={{ height: '320px' }}>
              <TelemetryChart data={telemetry} title="Generator Load" dataKey="load" color="#D97706" unit="%" />
            </div>
          )}
          {telemetry.some(t => t.voltage > 0) && (
            <div style={{ height: '320px' }}>
              <TelemetryChart data={telemetry} title="Battery Voltage" dataKey="voltage" color="#8B5CF6" unit="V" />
            </div>
          )}
          {telemetry.some(t => t.temp > 0) && (
            <div style={{ height: '320px' }}>
              <TelemetryChart data={telemetry} title="Temperature" dataKey="temp" color="#DC2626" unit="°C" />
            </div>
          )}
          {telemetry.some(t => t.vibration > 0) && (
            <div style={{ height: '320px' }}>
              <TelemetryChart data={telemetry} title="Vibration" dataKey="vibration" color="#0EA5E9" unit="mm/s" />
            </div>
          )}
          {telemetry.some(t => t.fuel > 0) && (
            <div style={{ height: '320px' }}>
              <TelemetryChart data={telemetry} title="Fuel Level" dataKey="fuel" color="#16A34A" unit="%" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
