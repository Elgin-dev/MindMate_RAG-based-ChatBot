import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const ConceptMap = ({ data }) => {
  // Turn our backend data into ReactFlow format
  const nodes = data.nodes.map((n, i) => ({
    id: n.id,
    data: { label: n.label },
    position: { x: i * 150, y: i * 50 }, // Simple layout
    style: { background: '#3b82f6', color: '#fff', borderRadius: '8px', padding: '10px' }
  }));

  const edges = data.edges.map((e) => ({
    id: `e${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: true,
  }));

  return (
    <div style={{ width: '100%', height: '400px', background: '#f8fafc', borderRadius: '15px' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default ConceptMap;