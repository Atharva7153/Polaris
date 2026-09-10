import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Hardcoded layout based on our new topology
const layoutPositions = {
  'FUEL-01': { x: 300, y: 50 },
  'DG-001': { x: 150, y: 150 },
  'DG-002': { x: 450, y: 150 },
  'HVAC-01': { x: 0, y: 250 },
  'HVAC-02': { x: 100, y: 250 },
  'BAT-01': { x: 200, y: 250 },
  'BAT-02': { x: 300, y: 250 },
  'PUMP-01': { x: 50, y: 350 },
  'COM-01': { x: 250, y: 350 },
  'BAT-03': { x: 400, y: 250 },
  'HVAC-03': { x: 500, y: 250 },
  'PUMP-02': { x: 600, y: 250 },
};

const getRiskColor = (level) => {
  if (level === 'CRITICAL' || level === 'HIGH') return '#DC2626';
  if (level === 'MEDIUM') return '#D97706';
  return '#16A34A';
};

export default function TopologyGraph({ assets, intelligence }) {
  const nodes = assets.map(a => {
    const risk = intelligence[a.assetId]?.risk?.level || 'LOW';
    const isCascade = intelligence[a.assetId]?.cascade?.cascadeRisks?.some(r => r.assetId === a.assetId);
    
    return {
      id: a.assetId,
      position: layoutPositions[a.assetId] || { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: (
          <div style={{ padding: '4px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{a.assetId}</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>{risk}</div>
          </div>
        )
      },
      style: {
        border: `2px solid ${getRiskColor(risk)}`,
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        width: 100,
        boxShadow: isCascade ? '0 0 10px rgba(220,38,38,0.5)' : 'none',
      }
    };
  });

  const edges = [];
  
  // We mirror the dependency_service.py edges here to draw them
  const depMap = {
    "FUEL-01": ["DG-001", "DG-002"],
    "DG-001": ["BAT-01", "BAT-02", "HVAC-01", "HVAC-02", "PUMP-01", "COM-01"],
    "DG-002": ["BAT-03", "HVAC-03", "PUMP-02"],
    "BAT-01": ["COM-01"]
  };

  Object.entries(depMap).forEach(([parent, children]) => {
    children.forEach(child => {
      // Check if this specific edge is an active cascade
      const isCascading = intelligence[parent]?.cascade?.cascadeRisks?.some(r => r.assetId === child);
      
      edges.push({
        id: `e-${parent}-${child}`,
        source: parent,
        target: child,
        animated: isCascading,
        style: { stroke: isCascading ? '#DC2626' : '#94A3B8', strokeWidth: isCascading ? 2 : 1 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCascading ? '#DC2626' : '#94A3B8',
        }
      });
    });
  });

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', backgroundColor: '#F8FAFC' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background color="#CBD5E1" gap={16} />
      </ReactFlow>
    </div>
  );
}
