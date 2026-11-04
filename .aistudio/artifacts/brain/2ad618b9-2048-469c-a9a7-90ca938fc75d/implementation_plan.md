# Implementation Plan - TripAdvisor Dashboard Integration

## Proposed Changes

### 1. Sidebar & Navigation
- Add a new "TripAdvisor" tab in `Sidebar.tsx` with an icon (e.g., Compass or MapPin/Globe).
- Add TripAdvisor connection status and configuration section in `SettingsTab.tsx` or a dedicated sub-view.

### 2. TripAdvisor Dashboard Components
- Create `src/components/TripAdvisorTab.tsx` combining:
  - Channel connection form (input TripAdvisor URL -> calls `/api/tripadvisor/sources`).
  - List of connected TripAdvisor sources and sync status.
  - Review queue with status filtering (`new`, `drafted`, `published_manually`), AI draft display, "Copia e apri TripAdvisor" button, and manual confirmation buttons.

### 3. App.tsx Integration
- Handle `activeTab === 'tripadvisor'` rendering `TripAdvisorTab`.
- Pass necessary business and auth props.

## Verification Plan
- Compile applet with `compile_applet`.
- Verify TypeScript compilation and UI rendering.
