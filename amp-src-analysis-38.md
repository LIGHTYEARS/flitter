# Agent 38: GlowText, DensityOrbWidget & Welcome Screen

## Overview

This analysis covers the welcome/greeting screen displayed when the flitter-amp client starts with an empty conversation, including the animated decorative widgets that compose it: `GlowText`, `DensityOrbWidget`, and the deprecated `OrbWidget`.

## File Inventory

| File | Lines | Role |
|------|-------|------|
| `packages/flitter-amp/src/widgets/glow-text.ts` | 109 | Per-character animated glow text effect |
| `packages/flitter-amp/src/widgets/density-orb-widget.ts` | 345 | ASCII-art animated orb with Perlin noise, shockwaves, and explosion |
| `packages/flitter-amp/src/widgets/orb-widget.ts` | 198 | Deprecated braille-based orb (predecessor to DensityOrbWidget) |
| `packages/flitter-amp/src/widgets/chat-view.ts` | ~90 lines | Welcome screen composition (buildEmptyState method) |

## 1. Welcome Screen Composition

The welcome screen is built by `ChatViewState.buildEmptyState()` in `chat-view.ts`. It is shown when `conversation.items` is empty — i.e., before the user sends their first message.

### Layout Structure

```
Column (center/center)
  └─ Row (min/center)
       ├─ DensityOrbWidget (40×20 animated orb)
       ├─ SizedBox(width: 2)  // spacer
       └─ Column (min/start)
            ├─ GlowText("Welcome to Amp", green glow)
            ├─ SizedBox(height: 1)
            ├─ Text(daily quote, dim)
            ├─ SizedBox(height: 1)
            ├─ Text("Ctrl+Enter" keybind hint)
            └─ Text("?" shortcuts hint)
```

### Daily Quote Rotation

A `QUOTES` array of ~15 programming quotes rotates daily using `Math.floor(Date.now() / 86400000) % QUOTES.length`. The same quote is shown all day.

### Transition to Chat View

The welcome screen disappears naturally via the reactive rebuild cycle. When `appState.conversation.items` becomes non-empty (after the first message), `ChatViewState.build()` takes the `items.length > 0` branch and renders the message list instead. No explicit transition animation exists — it's an instant swap on the next frame.

## 2. GlowText Widget

**File:** `packages/flitter-amp/src/widgets/glow-text.ts` (109 lines)

### Architecture

`GlowText` is a `StatefulWidget` that renders each character of its text string as an independent `TextSpan` with a unique per-frame color, creating a shimmering/glowing effect.

### Perlin Noise Engine

The file contains its own 1D Perlin noise implementation (`noiseGT`):

- **Permutation table (`PERM_GT`)**: 512-entry Uint8Array initialized with a Fisher-Yates shuffle at module load time
- **Noise function**: Uses quintic interpolation `t³(t(6t - 15) + 10)` (Ken Perlin's improved gradient noise)
- **Separate from the orb widgets**: Each file has its own independent noise implementation — `GlowText` uses 1D noise while the orb widgets use 2D noise with FBM (Fractal Brownian Motion)

### Animation Mechanism

```typescript
// 100ms interval (10 fps)
this.timer = setInterval(() => {
  this.setState(() => {
    this.timeOffset += 0.08;  // slow drift
  });
}, 100);
```

Each frame, the time offset advances by 0.08, causing the noise function to return different values per character. The noise value `n` is scaled by `glowIntensity` (default 0.4) and used to linearly interpolate between `baseColor` and `glowColor`:

```
color = baseColor + (glowColor - baseColor) × (noise × intensity)
```

This produces a subtle, organic shimmer where different characters glow at different intensities at any given moment.

### Per-Character Rendering

The `build()` method creates one `TextSpan` per character (N spans for N characters), each with a unique RGB `foreground` color. This means "Welcome to Amp" (14 chars) generates 14 TextSpan objects per frame — modest cost.

### Props

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `text` | string | required | The text to render |
| `baseColor` | Color | required | Resting color |
| `glowColor` | Color | required | Peak glow color |
| `bold` | boolean | false | Bold styling |
| `glowIntensity` | number | 0.4 | Glow amplitude (0-1) |

## 3. DensityOrbWidget

**File:** `packages/flitter-amp/src/widgets/density-orb-widget.ts` (345 lines)

### Architecture

A `StatefulWidget` rendering a 40×20 character animated orb using ASCII density characters with Perlin noise, featuring mouse-interactive shockwaves and a hidden explosion easter egg.

### Perlin Noise Engine (2D with FBM)

This widget has a full 2D Perlin noise implementation:

- **`noise2d(x, y)`**: Classic 2D gradient noise with 8-direction gradient table
- **`fbm(x, y, octaves)`**: Fractal Brownian Motion layering 3 octaves with halving amplitude and doubling frequency
- **Fade function**: Same quintic interpolation as GlowText

### Density Character Mapping

```typescript
const DENSITY_CHARS = ' .:-=+*#';
```

The FBM noise value (0.0 to 1.0) is mapped to one of 8 density levels, from empty space to full block. An elliptical mask (`dist = sqrt(nx² + ny²) > 1 → skip`) creates the circular orb shape within the 40×20 grid.

### Color Gradient

Colors interpolate from dark green to bright green based on the density level:
- **Dark theme**: `rgb(0, 55, 20)` → `rgb(0, 255, 136)`
- **Light theme**: `rgb(0, 30, 10)` → `rgb(0, 200, 100)`

Theme awareness is achieved via `AmpThemeProvider.maybeOf(context)`.

### Shockwave System

Clicking the orb triggers a radial shockwave:

```typescript
interface Shockwave {
  col: number;    // click position
  row: number;
  startTime: number;
}
```

- **Propagation**: `waveDist = elapsed × SHOCKWAVE_SPEED` (speed = 30 cells/sec)
- **Visual effect**: Cells near the wavefront get a density boost (`boost * 0.15` added to noise + level increase)
- **Duration**: Each shockwave lasts 1.0 time units, then is filtered out
- **Radius**: 3 cells wide wavefront ring

### Explosion Easter Egg

After 5 clicks (`MAX_CLICKS = 5`), the orb explodes:

1. `this.exploded = true` triggers a mode switch
2. 30 particles spawn from the center with random angles and speeds
3. Each particle carries a random density character and green-tinted color
4. Particles update positions each frame (`p.x += p.vx, p.y += p.vy`)
5. After 0.5 time units, the explosion fades to an empty `SizedBox`

The explosion rendering creates a 40×20 grid, stamps each particle's character at its rounded position, and builds `TextSpan` arrays row by row.

### Animation Loop

Same 100ms `setInterval` pattern as GlowText, incrementing `timeOffset` by 0.06 per tick. Each tick also:
- Filters expired shockwaves
- Updates particle positions (if exploded)

### Rendering Cost

Each frame generates `CELL_ROWS × CELL_COLS = 20 × 40 = 800` TextSpan objects, each requiring:
- FBM noise computation (3 octaves of 2D noise = ~12 gradient lookups)
- Distance check for elliptical mask
- Shockwave boost calculation (linear scan of active shockwaves)
- Color interpolation

This is the most expensive animated widget in the codebase, though at 10fps with 800 cells, the absolute cost is manageable.

## 4. OrbWidget (Deprecated)

**File:** `packages/flitter-amp/src/widgets/orb-widget.ts` (198 lines)

Marked `@deprecated` in favor of `DensityOrbWidget`. Uses **Unicode braille characters** (U+2800 range) instead of ASCII density characters.

### Braille Rendering Technique

Each terminal cell represents a 2×4 dot matrix via braille encoding:

```typescript
const BRAILLE_DOT_MAP: number[][] = [
  [0x01, 0x08],  // row 0: dots 1, 4
  [0x02, 0x10],  // row 1: dots 2, 5
  [0x04, 0x20],  // row 2: dots 3, 6
  [0x40, 0x80],  // row 3: dots 7, 8
];
```

The effective resolution is 80×80 dots packed into 40×20 cells. Each dot independently tests against the noise threshold (`NOISE_THRESHOLD = 0.38`), and dots above threshold contribute their bit to the braille codepoint.

### Key Differences from DensityOrbWidget

| Aspect | OrbWidget | DensityOrbWidget |
|--------|-----------|-----------------|
| Resolution | 80×80 (braille) | 40×20 (cell) |
| Characters | Braille U+2800+ | ASCII ` .:-=+*#` |
| Interactivity | None | Mouse shockwaves + explosion |
| Color range | Green only | Theme-aware green |
| Noise threshold | Binary (on/off at 0.38) | 8-level gradient |
| Visual style | Stippled dots | Density gradient |

The DensityOrbWidget replaced OrbWidget because ASCII density characters are more universally rendered across terminal emulators, while braille characters have inconsistent support.

## 5. Cross-Cutting Patterns

### Independent Noise Implementations

Three separate Perlin noise implementations exist across the three files. All use the same algorithm but with different:
- Dimensionality (1D vs 2D)
- Permutation tables (separate random seeds)
- Application (color modulation vs density mapping vs dot thresholding)

No shared noise utility exists — each widget is self-contained.

### Timer Lifecycle Protocol

All three widgets follow the identical timer pattern:
```
initState:  this.timer = setInterval(...)
dispose:    clearInterval(this.timer); this.timer = null
```

No `didUpdateWidget` override is needed since none of these widgets have props that affect the timer.

### Per-Cell TextSpan Generation

Both orb widgets generate one `TextSpan` per cell per frame (800 spans), assembled into `Text` widgets per row, wrapped in a `Column`. This is the standard pattern for character-art rendering in flitter — there is no lower-level "draw directly to the buffer" API available at the widget level.

### No Shared Animation Framework

As observed in the broader codebase (Agent 44's analysis), there is no `AnimationController` or `Ticker` abstraction. Each widget manages its own `setInterval`. The 100ms interval (10fps) is a convention, not an enforced standard.

## 6. Integration with App Lifecycle

- **Mount**: The welcome screen is the default state when `conversation.items` is empty
- **Display**: `buildEmptyState()` is called from `ChatViewState.build()` when no messages exist
- **Removal**: When the first message arrives, the next rebuild takes the message-list branch, unmounting the welcome screen widgets entirely
- **Cleanup**: `dispose()` on `GlowTextState` and `DensityOrbWidgetState` clears their `setInterval` timers, preventing memory leaks
- **No persistence**: The explosion state is lost if the widget is unmounted and remounted (it resets to the normal orb)

## 7. Code Quality Observations

**Strengths:**
- Self-contained widgets with no external dependencies beyond flitter-core primitives
- Clean timer lifecycle management
- Theme-aware color adaptation
- The shockwave/explosion easter egg adds personality without complexity overhead
- Braille encoding in OrbWidget is technically precise

**Weaknesses:**
- Three independent Perlin noise implementations could be extracted to a shared utility
- No FPS configurability — hardcoded 100ms intervals
- The DensityOrbWidget generates 800 TextSpan objects per frame with no caching of unchanged cells
- `OrbWidget` is deprecated but not removed
- The explosion particle system has no gravity or deceleration — particles move linearly forever (though they're only visible for 0.5 time units)

**Overall:** These widgets demonstrate effective use of procedural generation techniques (Perlin noise, FBM) adapted to the TUI medium, with thoughtful mapping of continuous noise values to discrete character sets and color gradients.
