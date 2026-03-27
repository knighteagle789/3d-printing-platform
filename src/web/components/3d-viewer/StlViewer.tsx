'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { StlModel } from './StlModel';
import { StlViewerErrorBoundary } from './StlViewerErrorBoundary';

interface StlViewerProps {
  url: string;
  className?: string;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e2e8f0" />
    </mesh>
  );
}

export function StlViewer({ url, className }: StlViewerProps) {
  return (
    <StlViewerErrorBoundary resetKey={url}>
      <div className={className ?? 'w-full h-[400px] rounded-lg overflow-hidden bg-slate-50 border'}>
        <Canvas
          camera={{ position: [5, 3, 5], fov: 50 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <Suspense fallback={<LoadingFallback />}>
            <Environment preset="studio" />
            <StlModel url={url} />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
      </div>
    </StlViewerErrorBoundary>
  );
}