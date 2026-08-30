import React, { useState, useEffect } from 'react';
import { ChatInterface } from './ChatInterface';
import { useLocation } from 'react-router-dom';

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener("toggle-ia-chat", handler);
    return () => window.removeEventListener("toggle-ia-chat", handler);
  }, []);

  // Hide on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className="fluent-chat-backdrop"
        onClick={() => setIsOpen(false)}
      />
      <div className="fluent-chat-panel">
        <ChatInterface onClose={() => setIsOpen(false)} />
      </div>

      <style>{`
        .fluent-chat-backdrop {
          position: fixed;
          inset: 0;
          z-index: 79;
          background: rgba(0,0,0,.08);
          backdrop-filter: blur(2px);
          animation: fluentFadeIn .2s ease-out both;
        }

        .fluent-chat-panel {
          position: fixed;
          z-index: 9999;
          bottom: 20px;
          right: 20px;
          width: 540px;
          max-width: calc(100vw - 40px);
          height: 85vh;
          max-height: 850px;
          border-radius: 30px;
          overflow: visible;
          animation: fluentSlideIn .28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @media (max-width: 640px) {
          .fluent-chat-panel {
            bottom: 8px;
            right: 8px;
            width: calc(100vw - 16px);
            max-width: none;
            height: calc(100dvh - 16px);
            max-height: none;
            border-radius: 24px;
          }
        }

        @keyframes fluentFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes fluentSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
