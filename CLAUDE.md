Act as an elite Systems Architect and Quant UI Engineer specializing in Econophysics platforms. We are rebuilding our market intelligence dashboard from scratch inside this Vite + React TypeScript project. The interface must merge the hyper-dense, data-rich ecosystem of MetaTrader 5 (MT5) with the clean, window-based mathematical analysis layout of MATLAB. 

We are leveraging TanStack Router for route state management, Tailwind CSS for interface styling, and Supabase for real-time market data orchestration.

### 1. CODEBASE RULES & CONVENTIONS
- Fully typed TypeScript strict mode. Use standard text and Markdown formatting—never use LaTeX blocks or raw code-block math notations.
- Use the `@/` root path alias for all component imports.
- Maintain TanStack Router compliance. The main application shell must reside natively within your file-based router structure (`src/routes/__root.tsx` or `src/routes/index.tsx`).
- Do not emit placeholder code or pseudo-comments like `// TODO: Implement later`. Write production-ready, logical code structures.

### 2. VISUAL LAYOUT ENGINE (MATLAB + MT5 HYBRID)
- Design a dark-mode, non-scrollable view-height grid layout (`h-screen overflow-hidden`) split into a three-pane system:
  1. Column 1 (Left 40%): MT5 Terminal Mirror for Asset A
     - Real-time Order Book / Depth of Market (DOM) component matrix.
     - High-performance canvas-based ticking chart displaying high-frequency candlesticks.
  2. Column 2 (Center 40%): MT5 Terminal Mirror for Asset B
     - Independent, mirrored instance tracking Asset B, optimized for visual cross-correlation and lead-lag identification.
  3. Bottom Dock (Full Width, Bottom 20%): MATLAB Numerical Console
     - A tabbed analytical station rendering responsive canvas-driven subplots instead of generic retail technical indicators.
     - Tab 1: Real-time Probability Density Function (PDF) curve mapping asset returns against a Gaussian baseline.
     - Tab 2: Shannon Entropy index line tracking market order vs. thermodynamic chaos.
     - Tab 3: Markov Chain live transition probability matrix tracking joint states between both assets.

### 3. REBUILD PROTOCOL STEP-BY-STEP
Execute this architecture incrementally. Confirm completion of each phase before proceeding to the next file:
- Phase 1: Define types and data interfaces for the dual-market streaming schema (`src/types/market.ts`).
- Phase 2: Build the core custom layout hook (`src/hooks/useMarketData.ts`) to handle real-time state inputs, computing rolling entropy matrices and joint Markov transitions.
- Phase 3: Create the independent canvas rendering components inside a components folder (`src/components/charts/`).
- Phase 4: Overwrite the active root routing entry node to mount the synchronized dual-terminal dashboard interface smoothly.