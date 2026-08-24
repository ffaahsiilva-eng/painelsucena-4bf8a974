# Plan: Extreme Performance Optimization

The goal is to achieve maximum fluidity and speed, especially on mobile, by reducing bundle size, optimizing rendering, and minimizing main-thread blocking.

## Performance & UX Improvements

- **Bundle Size & Tree Shaking**: Audit and ensure all heavy components are lazy-loaded.
- **Rendering Optimization**:
    - Implement `content-visibility: auto` on dashboard sections to skip rendering of off-screen content.
    - Use `React.memo` and `useDeferredValue` for heavy lists (RH, Presence).
    - Optimize `ModernStatCard` by disabling unnecessary chart animations on mobile.
- **Media Optimization**:
    - Force `preload="none"` and `poster` for all videos including the login transition.
    - Implement a `LoadingBoundary` for each dashboard widget to prevent layout shifts.
- **Main Thread Fluidity**:
    - Reduce the frequency of toast notifications.
    - Throttling/Debouncing of search inputs in RH and Presence.
    - Simplify the 3D page transition logic further for low-end devices.

## Technical Details

- **`src/pages/Dashboard.tsx`**: Add `contain-intrinsic-size` and `content-visibility` to dashboard items.
- **`src/components/dashboard/ModernStatCard.tsx`**: Disable Recharts animations if `isMobile` is true to save CPU.
- **`src/components/layout/PageTransition.tsx`**: Simplify the flip logic and reduce duration to 0.4s.
- **`src/components/auth/LoginTransition.tsx`**: Reduce video preloading impact and simplify keyframes.
- **`src/index.css`**: Add global performance-oriented utility classes like `.gpu-accelerated` and `.content-visibility-auto`.
- **`src/App.tsx`**: Ensure `PageLoader` uses a minimal SVG/CSS spinner instead of heavy components.

## Impact

- Significant reduction in "Total Blocking Time" (TBT).
- Smoother scrolling on the Dashboard and RH pages.
- Faster perceived load time due to better skeleton/lazy loading orchestration.
