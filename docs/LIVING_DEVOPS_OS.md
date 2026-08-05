# Living DevOps OS

## Scope

This update evolves the existing landing page without changing routes, authentication, backend integrations, or product workflows.

## Component architecture

- `GlowCard` owns the shared glass surface, pointer spotlight, restrained tilt, focus state, and active-stage treatment.
- `AnimatedPipeline` owns the seven-stage delivery sequence, one shared neon artifact, energy connections, terminal output, and stage reactions.
- `WorkflowJourney` owns the independent five-stage interview-preparation sequence and purple progress signal.
- `constants.ts` is the single source for stage content, timing, colors, status copy, and shared motion values.
- `LiveTerminal` renders command/output transitions separately from pipeline state.

## Motion behavior

- Delivery stages advance sequentially every 2.4 seconds while the hero is visible.
- The interview journey advances every 2.6 seconds while its section is visible.
- Animations stop when sections leave the viewport.
- `prefers-reduced-motion` disables timers, transforms, marquee movement, and decorative CSS animation.
- Stage motion communicates state: commit accepted, build progress, image creation, pod scaling, infrastructure assembly, metric heartbeat, and service health.

## Responsive behavior

- Desktop pipeline uses a compact four-column control-room grid.
- Tablet and mobile use two columns, removing connector lines that would imply an incorrect path.
- The preparation journey collapses from five columns to two, then one on small screens.
- Navigation, statistics, pricing, dashboard preview, technology cards, and footer preserve existing routes and actions.

## Visual system

- Dark glass surfaces use thin borders and low-opacity blue/violet illumination.
- Background grid, nodes, and texture remain at or below five percent opacity.
- Hover uses a maximum two-degree pointer tilt, a 1.03-scale equivalent lift, and a soft local spotlight.
- Text and controls remain HTML for contrast, selection, keyboard navigation, and screen-reader compatibility.

## Performance notes

- No Three.js or Lottie is used.
- Transforms and opacity are GPU-friendly.
- Viewport observers pause work outside the visible region.
- Shared components remove duplicated animation timers and card interaction logic.
