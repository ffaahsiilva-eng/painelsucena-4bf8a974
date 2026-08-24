import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Notebook page turn transition.
 * Uses 3D transforms to simulate a physical page flip.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [phase, setPhase] = useState<"idle" | "flipping">("idle");
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || isMobile)
  );

  useEffect(() => {
    // First render: show content immediately without animation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedChildren(children);
      return;
    }

    // Respect reduced motion settings
    if (prefersReducedMotion.current) {
      setDisplayedChildren(children);
      return;
    }

    // Start flipping animation
    setPhase("flipping");

    // Clear any existing timeouts to avoid race conditions
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    
    // Stage 1: The current page "closes" (rotates to 90deg)
    timeoutRef.current = window.setTimeout(() => {
      // Stage 2: Swap the content while the page is "vertical" (invisible to the user)
      setDisplayedChildren(children);
      
      // Stage 3: The new page "opens" (rotates back from 90deg to 0deg)
      timeoutRef.current = window.setTimeout(() => {
        setPhase("idle");
      }, 250); // Second half duration
    }, 250); // First half duration

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [location.pathname, children]);

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden perspective-2000 relative min-h-screen">
      <div
        className={`w-full h-full transform-origin-left transition-all ease-in-out transform-style-3d ${
          phase === "flipping" ? "animate-notebook-flip" : "opacity-100 transform-none"
        }`}
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <div className="w-full h-full">
          {displayedChildren}
        </div>
      </div>

      <style>{`
        .perspective-2000 {
          perspective: 2000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .transform-origin-left {
          transform-origin: left center;
        }
        
        @keyframes notebook-flip {
          0% {
            transform: rotateY(0deg);
            opacity: 1;
            filter: brightness(1);
          }
          48% {
            transform: rotateY(-90deg);
            opacity: 0.8;
            filter: brightness(0.7);
          }
          52% {
            transform: rotateY(90deg);
            opacity: 0.8;
            filter: brightness(1.3);
          }
          100% {
            transform: rotateY(0deg);
            opacity: 1;
            filter: brightness(1);
          }
        }
        
        .animate-notebook-flip {
          animation: notebook-flip 0.5s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
        }
      `}</style>
    </div>
  );
}
