import { useState, useEffect } from 'react';
import { Bell, MapPin, ChevronDown } from 'lucide-react';
import { useStation } from '../contexts/StationContext';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { socket } from '../App';

const pageTitles = {
  '/dashboard':       'Overview',
  '/decision-center': 'Operational Decision Center',
  '/digital-twin':    'Digital Twin',
  '/assets':          'Asset Management',
  '/telemetry':       'Telemetry',
  '/alerts':          'System Alerts',
  '/analytics':       'Analytics',
  '/settings':        'Settings',
};

const navbarStyle = {
  height: '72px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 32px',
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #D8E7F0',
  zIndex: 20,
};

const stationSelectorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  backgroundColor: '#F6FAFD',
  border: '1px solid #D8E7F0',
  borderRadius: '10px',
  cursor: 'pointer',
};

const liveIndicatorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  backgroundColor: '#F0FDF4',
  border: '1px solid #BBF7D0',
  borderRadius: '10px',
};

export default function Navbar() {
  const { stations, selectedStation, setSelectedStation } = useStation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  const title = pageTitles[location.pathname] || 'POLARIS';

  useEffect(() => {
    if (!selectedStation) return;

    const fetchAlertCount = async () => {
      try {
        const res = await client.get(`/alerts?stationId=${selectedStation._id}&status=ACTIVE&_t=${Date.now()}`);
        setActiveAlertCount(res.data.data.length);
      } catch (err) {
        console.error("Failed to fetch alerts for navbar", err);
      }
    };

    fetchAlertCount();

    const handleAlertChange = () => fetchAlertCount();

    socket.on('alert:created', handleAlertChange);
    socket.on('alert:updated', handleAlertChange);

    return () => {
      socket.off('alert:created', handleAlertChange);
      socket.off('alert:updated', handleAlertChange);
    };
  }, [selectedStation]);

  return (
    <header style={{
      ...navbarStyle,
      ...(activeAlertCount > 0 ? { borderBottom: '2px solid #DC2626', backgroundColor: '#FEF2F2' } : {})
    }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#12304A', margin: 0 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Station selector */}
        <div style={stationSelectorStyle}>
          <MapPin style={{ width: '16px', height: '16px', color: '#2563EB', flexShrink: 0 }} />
          <select
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '15px',
              fontWeight: 600,
              color: '#1E3448',
              outline: 'none',
              cursor: 'pointer',
              paddingRight: '6px',
              fontFamily: 'Inter, sans-serif',
            }}
            value={selectedStation?._id || ''}
            onChange={e => {
              const s = stations.find(st => st._id === e.target.value);
              if (s) setSelectedStation(s);
            }}
          >
            {stations.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown style={{ width: '16px', height: '16px', color: '#64748B', flexShrink: 0 }} />
        </div>

        {/* LIVE / CRITICAL indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px',
          ...(activeAlertCount > 0 
            ? { backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }
            : { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' })
        }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            backgroundColor: activeAlertCount > 0 ? '#DC2626' : '#16A34A',
            animation: 'pulse-dot 2s ease-in-out infinite',
            boxShadow: `0 0 0 3px ${activeAlertCount > 0 ? '#DC262633' : '#16A34A33'}`,
          }} />
          <span style={{ 
            fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
            color: activeAlertCount > 0 ? '#DC2626' : '#16A34A'
          }}>
            {activeAlertCount > 0 ? 'CRITICAL STATE' : 'LIVE'}
          </span>
        </div>

        {/* Bell */}
        <button
          onClick={() => navigate('/alerts')}
          style={{
            position: 'relative',
            padding: '10px',
            backgroundColor: '#F6FAFD',
            border: '1px solid #D8E7F0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#64748B',
          }}
        >
          <Bell style={{ width: '20px', height: '20px' }} />
          {activeAlertCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              minWidth: '20px', height: '20px', padding: '0 6px',
              backgroundColor: '#DC2626',
              borderRadius: '10px',
              border: '2px solid #FFFFFF',
              color: '#FFFFFF', fontSize: '11px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeAlertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
