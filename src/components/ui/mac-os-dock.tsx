'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface DockApp {
  id: string;
  name: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isEmergency?: boolean;
}

interface MacOSDockProps {
  apps: DockApp[];
  onAppClick: (appId: string) => void;
  className?: string;
}

const MacOSDock: React.FC<MacOSDockProps> = ({ 
  apps, 
  onAppClick, 
  className = ''
}) => {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [currentScales, setCurrentScales] = useState<number[]>(apps.map(() => 1));
  const [currentPositions, setCurrentPositions] = useState<number[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastMouseMoveTime = useRef<number>(0);

  // Calculate icon size dynamically based on number of apps and viewport
  const getResponsiveConfig = useCallback(() => {
    if (typeof window === 'undefined') {
      return { baseIconSize: 32, maxScale: 1.5, effectWidth: 200 };
    }
    const w = window.innerWidth;
    const maxDockWidth = w * 0.95; // max 95% of viewport
    const spacing = 2;
    // Calculate max icon size that fits all apps
    const maxIconForFit = Math.floor((maxDockWidth - 12) / apps.length - spacing);
    
    if (w < 480) {
      const size = Math.max(24, Math.min(30, maxIconForFit));
      return { baseIconSize: size, maxScale: 1.3, effectWidth: 120 };
    }
    if (w < 768) {
      const size = Math.max(26, Math.min(34, maxIconForFit));
      return { baseIconSize: size, maxScale: 1.35, effectWidth: 150 };
    }
    if (w < 1024) {
      const size = Math.max(28, Math.min(38, maxIconForFit));
      return { baseIconSize: size, maxScale: 1.4, effectWidth: 200 };
    }
    const size = Math.max(30, Math.min(42, maxIconForFit));
    return { baseIconSize: size, maxScale: 1.5, effectWidth: 240 };
  }, [apps.length]);

  const [config, setConfig] = useState(getResponsiveConfig);
  const { baseIconSize, maxScale, effectWidth } = config;
  const minScale = 1.0;
  const baseSpacing = Math.max(1, baseIconSize * 0.04);

  useEffect(() => {
    const handleResize = () => setConfig(getResponsiveConfig());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getResponsiveConfig]);

  // Recalculate when apps change
  useEffect(() => {
    setConfig(getResponsiveConfig());
  }, [apps.length, getResponsiveConfig]);

  const calculateTargetMagnification = useCallback((mousePosition: number | null) => {
    if (mousePosition === null) return apps.map(() => minScale);
    return apps.map((_, index) => {
      const normalIconCenter = (index * (baseIconSize + baseSpacing)) + (baseIconSize / 2);
      const minX = mousePosition - (effectWidth / 2);
      const maxX = mousePosition + (effectWidth / 2);
      if (normalIconCenter < minX || normalIconCenter > maxX) return minScale;
      const theta = ((normalIconCenter - minX) / effectWidth) * 2 * Math.PI;
      const cappedTheta = Math.min(Math.max(theta, 0), 2 * Math.PI);
      const scaleFactor = (1 - Math.cos(cappedTheta)) / 2;
      return minScale + (scaleFactor * (maxScale - minScale));
    });
  }, [apps, baseIconSize, baseSpacing, effectWidth, maxScale, minScale]);

  const calculatePositions = useCallback((scales: number[]) => {
    let currentX = 0;
    return scales.map((scale) => {
      const scaledWidth = baseIconSize * scale;
      const centerX = currentX + (scaledWidth / 2);
      currentX += scaledWidth + baseSpacing;
      return centerX;
    });
  }, [baseIconSize, baseSpacing]);

  useEffect(() => {
    const initialScales = apps.map(() => minScale);
    setCurrentScales(initialScales);
    setCurrentPositions(calculatePositions(initialScales));
  }, [apps, calculatePositions, minScale, config]);

  const animateToTarget = useCallback(() => {
    const targetScales = calculateTargetMagnification(mouseX);
    const targetPositions = calculatePositions(targetScales);
    const lerpFactor = mouseX !== null ? 0.2 : 0.12;

    setCurrentScales(prev => prev.map((s, i) => s + (targetScales[i] - s) * lerpFactor));
    setCurrentPositions(prev => prev.map((p, i) => p + (targetPositions[i] - p) * lerpFactor));

    const needsUpdate = currentScales.some((s, i) => Math.abs(s - targetScales[i]) > 0.002) ||
      currentPositions.some((p, i) => Math.abs(p - targetPositions[i]) > 0.1) || mouseX !== null;
    
    if (needsUpdate) {
      animationFrameRef.current = requestAnimationFrame(animateToTarget);
    }
  }, [mouseX, calculateTargetMagnification, calculatePositions, currentScales, currentPositions]);

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animateToTarget);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [animateToTarget]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastMouseMoveTime.current < 16) return;
    lastMouseMoveTime.current = now;
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const padding = Math.max(4, baseIconSize * 0.08);
      setMouseX(e.clientX - rect.left - padding);
    }
  }, [baseIconSize]);

  const handleMouseLeave = useCallback(() => { setMouseX(null); setHoveredIndex(null); }, []);

  const handleAppClick = (appId: string, index: number) => {
    const el = iconRefs.current[index];
    if (el) {
      const bounceHeight = Math.max(-5, -baseIconSize * 0.1);
      el.style.transition = 'transform 0.2s ease-out';
      el.style.transform = `translateY(${bounceHeight}px)`;
      setTimeout(() => { el.style.transform = 'translateY(0px)'; }, 200);
    }
    onAppClick(appId);
  };

  const contentWidth = currentPositions.length > 0 
    ? Math.max(...currentPositions.map((pos, i) => pos + (baseIconSize * currentScales[i]) / 2))
    : (apps.length * (baseIconSize + baseSpacing)) - baseSpacing;

  const padding = Math.max(4, baseIconSize * 0.08);

  return (
    <div 
      ref={dockRef}
      className={`backdrop-blur-md ${className}`}
      style={{
        width: `${contentWidth + padding * 2}px`,
        background: 'rgba(45, 45, 45, 0.75)',
        borderRadius: `${Math.max(8, baseIconSize * 0.25)}px`,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
        padding: `${padding}px`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative" style={{ height: `${baseIconSize}px`, width: '100%' }}>
        {apps.map((app, index) => {
          const scale = currentScales[index] || 1;
          const position = currentPositions[index] || 0;
          const scaledSize = baseIconSize * scale;
          
          return (
            <div
              key={app.id}
              ref={(el) => { iconRefs.current[index] = el; }}
              className="absolute cursor-pointer flex flex-col items-center justify-center"
              title=""
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleAppClick(app.id, index)}
              style={{
                left: `${position - scaledSize / 2}px`,
                bottom: '0px',
                width: `${scaledSize}px`,
                height: `${scaledSize}px`,
                transformOrigin: 'bottom center',
                zIndex: Math.round(scale * 10)
              }}
            >
              {/* Floating name tooltip */}
              {hoveredIndex === index && (
                <div
                  className="absolute pointer-events-none whitespace-nowrap px-2 py-1 rounded-md text-xs font-medium"
                  style={{
                    top: `${-24}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(30, 30, 30, 0.9)',
                    color: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 100,
                  }}
                >
                  {app.name}
                </div>
              )}
              <div
                className={`flex items-center justify-center rounded-lg transition-colors ${
                  app.isActive 
                    ? 'bg-white/20 shadow-lg' 
                    : 'bg-white/10 hover:bg-white/15'
                }`}
                style={{ 
                  width: `${scaledSize * 0.88}px`, 
                  height: `${scaledSize * 0.88}px`,
                }}
              >
                <div style={{ transform: `scale(${Math.min(scale, 1.3)})` }} className={app.isEmergency ? 'text-red-400 animate-pulse' : 'text-white/90'}>
                  {app.icon}
                </div>
              </div>
              
              {app.isActive && (
                <div 
                  className="absolute"
                  style={{
                    bottom: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 0 3px rgba(255,255,255,0.5)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MacOSDock;
