import { useState, useEffect } from 'react';
import { useStation } from '../contexts/StationContext';
import client from '../api/client';
import AssetDetailPanel from '../components/AssetDetailPanel';
import TopologyGraph from '../components/TopologyGraph';
import { Cpu, Zap, Wind, Battery, Fuel, Activity } from 'lucide-react';

const typeConfig = {
  Generator: { icon: Zap,     color: '#2563EB', label: 'Power Generation' },
  HVAC:      { icon: Wind,    color: '#0EA5E9', label: 'Climate Control'  },
  Battery:   { icon: Battery, color: '#16A34A', label: 'Energy Storage'   },
  Fuel:      { icon: Fuel,    color: '#D97706', label: 'Fuel Systems'     },
  Pump:      { icon: Activity,color: '#0EA5E9', label: 'Coolant Pump'     },
  Communications: { icon: Cpu,color: '#8B5CF6', label: 'Comms Array'      },
};

const statusConfig = {
  NORMAL:   { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
  WARNING:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  CRITICAL: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
  LOW:      { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
  MEDIUM:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  HIGH:     { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
};

export default function DigitalTwin() {
  const { selectedStation } = useStation();
  const [assets, setAssets] = useState([]);
  const [intelligence, setIntelligence] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'topology'

  useEffect(() => { if (selectedStation) fetchAssets(); }, [selectedStation]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/stations/${selectedStation._id}/assets`);
      setAssets(res.data.data);
      
      const intelRes = await client.get(`/stations/${selectedStation._id}/intelligence`);
      if (intelRes.data.data && intelRes.data.data.status !== "UNAVAILABLE") {
          const intelMap = {};
          intelRes.data.data.assetsIntelligence.forEach(intel => {
              intelMap[intel.assetId] = intel;
          });
          setIntelligence(intelMap);
      } else {
          setIntelligence({});
      }
    } catch {}
    finally { setLoading(false); }
  };

  const getTypeConfig = (type) => {
    const key = Object.keys(typeConfig).find(k => type?.includes(k)) || 'Generator';
    return typeConfig[key];
  };

  const openAssetDetails = async (asset) => {
      // Re-fetch individual asset to get latest full populated data
      try {
          const res = await client.get(`/assets/${asset._id}`);
          setSelectedAsset(res.data.data);
      } catch (err) {
          console.error(err);
      }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#12304A', margin: '0 0 6px' }}>
            Digital Twin
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>
            Interactive station model — {selectedStation?.name}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* View Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '4px' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'grid' ? '#2563EB' : '#64748B',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >Grid View</button>
            <button
              onClick={() => setViewMode('topology')}
              style={{
                padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: viewMode === 'topology' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'topology' ? '#2563EB' : '#64748B',
                boxShadow: viewMode === 'topology' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >Dependency Graph</button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 18px',
            backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px',
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: '#16A34A',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#16A34A', letterSpacing: '0.08em' }}>LIVE SYNC</span>
          </div>
        </div>
      </div>

      {/* Station Schematic */}
      <div style={{
        flex: 1,
        minHeight: '540px',
        backgroundColor: '#F0F8FD',
        border: '1px solid #D8E7F0',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
      }} className="station-grid">

        {loading ? (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748B', fontSize: '15px', gap: '10px',
          }}>
            <Cpu style={{ width: '22px', height: '22px', color: '#2563EB' }} />
            Initializing Digital Twin…
          </div>
        ) : (
          <>
            {/* Station label */}
            <div style={{
              position: 'absolute', top: '20px', left: '20px',
              backgroundColor: '#FFFFFF', border: '1px solid #D8E7F0',
              borderRadius: '8px', padding: '8px 16px',
              boxShadow: '0 1px 3px rgba(18,48,74,0.08)',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB', letterSpacing: '0.06em' }}>
                {selectedStation?.name} Research Facility
              </span>
            </div>

            {/* Legend */}
            <div style={{
              position: 'absolute', top: '20px', right: '20px',
              backgroundColor: '#FFFFFF', border: '1px solid #D8E7F0',
              borderRadius: '8px', padding: '12px 16px',
              boxShadow: '0 1px 3px rgba(18,48,74,0.08)',
              zIndex: 10,
            }}>
              {[['LOW','#16A34A'],['MEDIUM','#D97706'],['HIGH / CRITICAL','#DC2626']].map(([label,color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{label} Risk</span>
                </div>
              ))}
            </div>

            {viewMode === 'topology' ? (
              <TopologyGraph assets={assets} intelligence={intelligence} />
            ) : (
              <div style={{
                position: 'absolute', inset: '80px 20px 20px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                overflowY: 'auto'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '20px',
                  width: '100%',
                  paddingBottom: '20px',
                }}>
                  {assets.map(asset => {
                  const tc = getTypeConfig(asset.type);
                  
                  const assetIntel = intelligence[asset.assetId];
                  const riskLevel = assetIntel?.risk?.level || 'LOW';
                  
                  // Map database status to Operational terminology
                  let opStatus = 'ONLINE';
                  let opColor = '#16A34A';
                  if (asset.status === 'WARNING') { opStatus = 'DEGRADED'; opColor = '#D97706'; }
                  if (asset.status === 'CRITICAL') { opStatus = 'OFFLINE'; opColor = '#DC2626'; }

                  // Risk mapping
                  const rStyle = statusConfig[riskLevel] || statusConfig.LOW;
                  
                  // Check if there is cascade dependency risk
                  const isCascade = assetIntel?.cascade?.cascadeRisks?.some(r => r.assetId === asset.assetId);
                  
                  const Icon = tc?.icon || Cpu;
                  return (
                    <div
                      key={asset._id}
                      onClick={() => openAssetDetails(asset)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: `1.5px solid ${rStyle.border}`,
                        borderRadius: '12px',
                        padding: '24px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        boxShadow: '0 2px 8px rgba(18,48,74,0.06)',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(18,48,74,0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(18,48,74,0.06)';
                      }}
                    >
                      {/* Operational Status Dot */}
                      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: opColor, letterSpacing: '0.05em' }}>
                          {opStatus}
                        </span>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          backgroundColor: opColor,
                          boxShadow: `0 0 0 3px ${opColor}33`,
                        }} />
                      </div>

                      {/* Icon */}
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '10px',
                        backgroundColor: rStyle.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '16px',
                        border: `1px solid ${rStyle.border}`,
                      }}>
                        <Icon style={{ width: '22px', height: '22px', color: rStyle.color }} />
                      </div>

                      <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '4px' }}>
                        {asset.assetId}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#12304A', marginBottom: '6px' }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: '15px', color: '#64748B', marginBottom: '20px' }}>
                        {asset.type}
                      </div>

                      <div style={{
                        paddingTop: '16px', borderTop: '1px solid #EDF2F7',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Risk Level</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: rStyle.color }}>
                            {isCascade ? 'CASCADE' : riskLevel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Criticality</span>
                          <span style={{ fontSize: '14px', color: '#1E3448', fontWeight: 700 }}>
                            {asset.criticality}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedAsset && (
        <AssetDetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}
    </div>
  );
}
