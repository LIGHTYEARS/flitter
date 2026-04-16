/**
 * Flitter TUI Layout Demo
 *
 * Demonstrates the Flitter widget/render-object system by working directly
 * with render objects: ContainerRenderObject, RenderSizedBox, RenderFlex,
 * and RenderPositionedBox.
 *
 * Pipeline:  RenderObject -> layout(constraints) -> paint(screen) -> AnsiRenderer -> stdout
 *
 * Run:  bun run examples/tui-layout-demo.ts
 */

import { Screen, AnsiRenderer, SGR_RESET } from "../packages/tui/src/screen/index.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { BoxConstraints } from "../packages/tui/src/tree/constraints.js";
import { ContainerRenderObject } from "../packages/tui/src/widgets/container.js";
import { RenderSizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { RenderPositionedBox } from "../packages/tui/src/widgets/align.js";
import { RenderFlex, FlexParentData } from "../packages/tui/src/widgets/flex.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";

// ============================================================
//  Constants
// ============================================================

const WIDTH = 80;
const HEIGHT = 24;

// ============================================================
//  Helper: write a string to the screen at (x, y)
// ============================================================

function writeText(
  screen: Screen,
  x: number,
  y: number,
  text: string,
  style: TextStyle,
): void {
  for (let i = 0; i < text.length; i++) {
    if (x + i >= WIDTH) break;
    screen.writeChar(x + i, y, text[i], style);
  }
}

// ============================================================
//  Helper: set flex parent data on a child before adopting
// ============================================================

function setFlex(child: { parentData: unknown }, flex: number, fit: "tight" | "loose" = "tight"): void {
  const pd = child.parentData as FlexParentData;
  pd.flex = flex;
  pd.fit = fit;
}

// ============================================================
//  Styles
// ============================================================

const titleStyle = new TextStyle({
  foreground: Color.white(),
  background: Color.blue(),
  bold: true,
});

const labelStyle = new TextStyle({
  foreground: Color.cyan(),
  bold: true,
});

const dimStyle = new TextStyle({
  foreground: Color.brightBlack(),
});

const whiteOnRed = new TextStyle({
  foreground: Color.white(),
  background: Color.red(),
});

const whiteOnGreen = new TextStyle({
  foreground: Color.white(),
  background: Color.green(),
});

const blackOnYellow = new TextStyle({
  foreground: Color.black(),
  background: Color.yellow(),
});

const whiteOnMagenta = new TextStyle({
  foreground: Color.white(),
  background: Color.magenta(),
});

// ============================================================
//  Build the screen
// ============================================================

const screen = new Screen(WIDTH, HEIGHT);
const renderer = new AnsiRenderer();

// --------------------------------------------------
//  Section 1: Title bar  (ContainerRenderObject with background)
// --------------------------------------------------

const titleBar = new ContainerRenderObject(
  WIDTH,   // width
  1,       // height
  undefined, // padding
  undefined, // margin
  new BoxDecoration({ color: Color.blue() }),
);

titleBar.layout(BoxConstraints.tight(WIDTH, 1));
titleBar.paint(screen, 0, 0);

const title = "  Flitter TUI Layout Demo  --  Widget Rendering Pipeline  ";
writeText(screen, 0, 0, title.padEnd(WIDTH), titleStyle);

// --------------------------------------------------
//  Section 2: Row layout with RenderFlex (horizontal)
// --------------------------------------------------

const sectionY2 = 2;
writeText(screen, 1, sectionY2, "1. RenderFlex (Row) -- three equal boxes", labelStyle);

const row = new RenderFlex({
  direction: "horizontal",
  mainAxisAlignment: "start",
  crossAxisAlignment: "start",
  mainAxisSize: "max",
});

// Three colored containers in a row
const boxA = new ContainerRenderObject(
  24, 3,
  EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
  undefined,
  new BoxDecoration({
    color: Color.red(),
    border: Border.all(new BorderSide(Color.brightRed(), 1, "rounded")),
  }),
);

const boxB = new ContainerRenderObject(
  24, 3,
  EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
  undefined,
  new BoxDecoration({
    color: Color.green(),
    border: Border.all(new BorderSide(Color.brightGreen(), 1, "rounded")),
  }),
);

const boxC = new ContainerRenderObject(
  24, 3,
  EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
  undefined,
  new BoxDecoration({
    color: Color.yellow(),
    border: Border.all(new BorderSide(Color.brightYellow(), 1, "rounded")),
  }),
);

row.adoptChild(boxA);
row.adoptChild(boxB);
row.adoptChild(boxC);

row.layout(BoxConstraints.tight(WIDTH - 2, 3));
row.paint(screen, 1, sectionY2 + 1);

// Labels inside boxes
writeText(screen, 3, sectionY2 + 2, "  Box A (24x3)  ", whiteOnRed);
writeText(screen, 27, sectionY2 + 2, "  Box B (24x3)  ", whiteOnGreen);
writeText(screen, 51, sectionY2 + 2, "  Box C (24x3)  ", blackOnYellow);

// --------------------------------------------------
//  Section 3: Column layout with RenderFlex (vertical)
// --------------------------------------------------

const sectionY3 = 6;
writeText(screen, 1, sectionY3, "2. RenderFlex (Column) -- vertical stack", labelStyle);

const col = new RenderFlex({
  direction: "vertical",
  mainAxisAlignment: "start",
  crossAxisAlignment: "start",
  mainAxisSize: "min",
});

const colItem1 = new ContainerRenderObject(
  36, 1, undefined, undefined,
  new BoxDecoration({ color: Color.rgb(60, 60, 120) }),
);

const colItem2 = new ContainerRenderObject(
  36, 1, undefined, undefined,
  new BoxDecoration({ color: Color.rgb(80, 80, 160) }),
);

const colItem3 = new ContainerRenderObject(
  36, 1, undefined, undefined,
  new BoxDecoration({ color: Color.rgb(100, 100, 200) }),
);

col.adoptChild(colItem1);
col.adoptChild(colItem2);
col.adoptChild(colItem3);

col.layout(new BoxConstraints({ minWidth: 0, maxWidth: 36, minHeight: 0, maxHeight: 3 }));
col.paint(screen, 1, sectionY3 + 1);

writeText(screen, 2, sectionY3 + 1, " Row 1: rgb(60,60,120)  ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(60, 60, 120) }));
writeText(screen, 2, sectionY3 + 2, " Row 2: rgb(80,80,160)  ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(80, 80, 160) }));
writeText(screen, 2, sectionY3 + 3, " Row 3: rgb(100,100,200)", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(100, 100, 200) }));

// --------------------------------------------------
//  Section 4: RenderPositionedBox (Center/Align)
// --------------------------------------------------

const sectionY4 = 6;
writeText(screen, 40, sectionY4, "3. RenderPositionedBox (Center)", labelStyle);

// A centered child inside a bordered parent area
const centerOuter = new ContainerRenderObject(
  36, 3, undefined, undefined,
  new BoxDecoration({
    color: Color.rgb(30, 30, 50),
    border: Border.all(new BorderSide(Color.brightBlue(), 1, "rounded")),
  }),
);

const centerAlign = new RenderPositionedBox(); // centers by default
const centerChild = new ContainerRenderObject(
  14, 1, undefined, undefined,
  new BoxDecoration({ color: Color.magenta() }),
);

centerAlign.adoptChild(centerChild);
centerOuter.adoptChild(centerAlign);

centerOuter.layout(BoxConstraints.tight(36, 3));
centerOuter.paint(screen, 42, sectionY4 + 1);

writeText(screen, 53, sectionY4 + 2, "  Centered!  ", whiteOnMagenta);

// --------------------------------------------------
//  Section 5: Container with padding and border
// --------------------------------------------------

const sectionY5 = 10;
writeText(screen, 1, sectionY5, "4. Container: padding + border + background", labelStyle);

const paddedBox = new ContainerRenderObject(
  38, 5,
  EdgeInsets.all(1), // 1-cell padding on all sides
  undefined,
  new BoxDecoration({
    color: Color.rgb(40, 40, 60),
    border: Border.all(new BorderSide(Color.cyan(), 1, "rounded")),
  }),
);

const innerBox = new ContainerRenderObject(
  undefined, undefined,
  undefined, undefined,
  new BoxDecoration({ color: Color.rgb(80, 40, 80) }),
);

paddedBox.adoptChild(innerBox);
paddedBox.layout(BoxConstraints.tight(38, 5));
paddedBox.paint(screen, 1, sectionY5 + 1);

writeText(screen, 4, sectionY5 + 3, " padding=1, border=cyan ", new TextStyle({
  foreground: Color.brightWhite(),
  background: Color.rgb(80, 40, 80),
}));

// --------------------------------------------------
//  Section 6: Flex with spaceBetween alignment
// --------------------------------------------------

writeText(screen, 42, sectionY5, "5. Flex: mainAxisAlignment=spaceBetween", labelStyle);

const spaceBetweenRow = new RenderFlex({
  direction: "horizontal",
  mainAxisAlignment: "spaceBetween",
  crossAxisAlignment: "center",
  mainAxisSize: "max",
});

const sbItem1 = new ContainerRenderObject(6, 3, undefined, undefined, new BoxDecoration({
  color: Color.red(),
  border: Border.all(new BorderSide(Color.brightRed(), 1, "solid")),
}));

const sbItem2 = new ContainerRenderObject(6, 3, undefined, undefined, new BoxDecoration({
  color: Color.green(),
  border: Border.all(new BorderSide(Color.brightGreen(), 1, "solid")),
}));

const sbItem3 = new ContainerRenderObject(6, 3, undefined, undefined, new BoxDecoration({
  color: Color.blue(),
  border: Border.all(new BorderSide(Color.brightBlue(), 1, "solid")),
}));

const sbItem4 = new ContainerRenderObject(6, 3, undefined, undefined, new BoxDecoration({
  color: Color.magenta(),
  border: Border.all(new BorderSide(Color.brightMagenta(), 1, "solid")),
}));

spaceBetweenRow.adoptChild(sbItem1);
spaceBetweenRow.adoptChild(sbItem2);
spaceBetweenRow.adoptChild(sbItem3);
spaceBetweenRow.adoptChild(sbItem4);

spaceBetweenRow.layout(BoxConstraints.tight(36, 3));
spaceBetweenRow.paint(screen, 42, sectionY5 + 1);

writeText(screen, 43, sectionY5 + 2, " R ", whiteOnRed);
writeText(screen, 53, sectionY5 + 2, " G ", whiteOnGreen);
writeText(screen, 63, sectionY5 + 2, " B ", new TextStyle({ foreground: Color.white(), background: Color.blue() }));
writeText(screen, 73, sectionY5 + 2, " M ", whiteOnMagenta);

// --------------------------------------------------
//  Section 7: SizedBox demonstration
// --------------------------------------------------

const sectionY7 = 16;
writeText(screen, 1, sectionY7, "6. RenderSizedBox -- fixed dimensions", labelStyle);

const sizedRow = new RenderFlex({
  direction: "horizontal",
  mainAxisAlignment: "start",
  crossAxisAlignment: "start",
  mainAxisSize: "min",
});

const sized1 = new RenderSizedBox(10, 3);
const fill1 = new ContainerRenderObject(undefined, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(180, 60, 60),
  border: Border.all(new BorderSide(Color.brightRed(), 1, "rounded")),
}));
sized1.adoptChild(fill1);

const sized2 = new RenderSizedBox(20, 3);
const fill2 = new ContainerRenderObject(undefined, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(60, 180, 60),
  border: Border.all(new BorderSide(Color.brightGreen(), 1, "rounded")),
}));
sized2.adoptChild(fill2);

const sized3 = new RenderSizedBox(15, 3);
const fill3 = new ContainerRenderObject(undefined, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(60, 60, 180),
  border: Border.all(new BorderSide(Color.brightBlue(), 1, "rounded")),
}));
sized3.adoptChild(fill3);

sizedRow.adoptChild(sized1);
sizedRow.adoptChild(sized2);
sizedRow.adoptChild(sized3);

sizedRow.layout(new BoxConstraints({ minWidth: 0, maxWidth: WIDTH - 2, minHeight: 0, maxHeight: 3 }));
sizedRow.paint(screen, 1, sectionY7 + 1);

writeText(screen, 2, sectionY7 + 2, " 10 wide", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(180, 60, 60) }));
writeText(screen, 14, sectionY7 + 2, "    20 wide     ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(60, 180, 60) }));
writeText(screen, 34, sectionY7 + 2, "   15 wide  ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(60, 60, 180) }));

// --------------------------------------------------
//  Section 8: Nested containers with rounded borders
// --------------------------------------------------

const sectionY8 = 16;
writeText(screen, 50, sectionY8, "7. Nested containers", labelStyle);

const outerNest = new ContainerRenderObject(
  28, 4, EdgeInsets.all(1), undefined,
  new BoxDecoration({
    color: Color.rgb(30, 30, 45),
    border: Border.all(new BorderSide(Color.brightCyan(), 1, "rounded")),
  }),
);

const innerNest = new ContainerRenderObject(
  undefined, undefined, undefined, undefined,
  new BoxDecoration({
    color: Color.rgb(60, 30, 60),
    border: Border.all(new BorderSide(Color.brightMagenta(), 1, "rounded")),
  }),
);

outerNest.adoptChild(innerNest);
outerNest.layout(BoxConstraints.tight(28, 4));
outerNest.paint(screen, 50, sectionY8 + 1);

writeText(screen, 54, sectionY8 + 3, " inner: magenta ", new TextStyle({
  foreground: Color.brightWhite(),
  background: Color.rgb(60, 30, 60),
}));

// --------------------------------------------------
//  Section 9: Flex with crossAxisAlignment=stretch
// --------------------------------------------------

const sectionY9 = 20;
writeText(screen, 1, sectionY9, "8. Flex: crossAxisAlignment=stretch", labelStyle);

const stretchRow = new RenderFlex({
  direction: "horizontal",
  mainAxisAlignment: "start",
  crossAxisAlignment: "stretch",
  mainAxisSize: "max",
});

const strItem1 = new ContainerRenderObject(18, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(100, 50, 50),
}));

const strItem2 = new ContainerRenderObject(18, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(50, 100, 50),
}));

const strItem3 = new ContainerRenderObject(18, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(50, 50, 100),
}));

const strItem4 = new ContainerRenderObject(18, undefined, undefined, undefined, new BoxDecoration({
  color: Color.rgb(100, 50, 100),
}));

stretchRow.adoptChild(strItem1);
stretchRow.adoptChild(strItem2);
stretchRow.adoptChild(strItem3);
stretchRow.adoptChild(strItem4);

stretchRow.layout(BoxConstraints.tight(WIDTH - 6, 2));
stretchRow.paint(screen, 1, sectionY9 + 1);

writeText(screen, 2, sectionY9 + 1, "  stretched h=2 ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(100, 50, 50) }));
writeText(screen, 20, sectionY9 + 1, "  stretched h=2 ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(50, 100, 50) }));
writeText(screen, 38, sectionY9 + 1, "  stretched h=2 ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(50, 50, 100) }));
writeText(screen, 56, sectionY9 + 1, "  stretched h=2 ", new TextStyle({ foreground: Color.brightWhite(), background: Color.rgb(100, 50, 100) }));

// --------------------------------------------------
//  Footer
// --------------------------------------------------

const footerY = HEIGHT - 1;
const footerBg = Color.rgb(40, 40, 40);
screen.fill(0, footerY, WIDTH, 1, " ", { bg: footerBg });
writeText(screen, 1, footerY, " Flitter TUI ", new TextStyle({
  foreground: Color.brightCyan(),
  background: footerBg,
  bold: true,
}));
writeText(screen, 15, footerY, "| Screen: 80x24 | Widgets: Container, Flex, SizedBox, Align |", new TextStyle({
  foreground: Color.brightBlack(),
  background: footerBg,
}));

// ============================================================
//  Render to ANSI and write to stdout
// ============================================================

const output = renderer.renderFull(screen);
process.stdout.write(output);
process.stdout.write(SGR_RESET + "\n");
