# Technical Audit and Performance Optimization Plan

A comprehensive technical audit to maximize system performance, fluidity, and stability. The goal is to reach Lighthouse scores near 100 while ensuring a "zero-lag" user experience across all devices.

## Performance & Optimization

### Bundle & Asset Management
- Verify lazy loading boundaries in `App.tsx` and `Dashboard.tsx` to ensure optimal code splitting.
- Audit heavy assets (videos, GIFs) and ensure proper compression and conditional loading (especially for mobile).
- Review `package.json` for redundant or heavy dependencies that can be replaced with lighter alternatives or native browser APIs.

### React & Rendering Optimization
- Minimize re-renders in heavy components (Dashboard widgets, RH tables, InstaCena feeds) using `React.memo`, `useMemo`, and `useCallback`.
- Optimize global state propagation to prevent "rippling" re-renders across the application tree.
- Refine GPU acceleration triggers in `index.css` to ensure smooth scrolling and transitions without over-allocating memory.

### Data & Realtime Efficiency
- Audit Supabase queries across all hooks to avoid `SELECT *` and fetch only required columns.
- Optimize `realtimeManager.ts` to multiplex websocket subscriptions more efficiently, reducing browser overhead.
- Implement more aggressive caching for static or slow-changing data (Site Settings, User Roles) with appropriate invalidation triggers.

### Technical Debt & Code Quality
- Identify and remove dead code, unused assets, and legacy components from previous iterations.
- Standardize hook patterns for consistent behavior across environments (Barcarena/Paragominas).
- Resolve any remaining TypeScript warnings or implicit `any` types that might hide runtime performance bottlenecks.

## Implementation Details

### Phase 1: High-Impact Frontend Fixes
- Optimize asset loading in `LoginTransition.tsx` and `BirthdayBanner.tsx`.
- Refactor `useAllUsers.ts` to reduce heartbeat frequency and background processing.
- Apply `content-visibility: auto` more broadly to large scrollable lists.

### Phase 2: Database & Hook Refinement
- Update hooks like `useRHEfetivo.ts`, `useDocuments.ts`, and `useEquipmentMovements.ts` to use targeted column selection.
- Refine React Query `staleTime` and `cacheTime` settings across the board.

### Phase 3: Final Polishing
- Final review of `index.css` for CSS containment and layout stability.
- Ensure all PDF generation and Excel exports are non-blocking for the UI thread.
