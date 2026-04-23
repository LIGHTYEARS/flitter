/**
 * Kitty Graphics Protocol — APC 序列生成工具函数。
 *
 * 实现 Kitty 终端图形协议的低级传输和占位符格网构造。
 * 支持:
 *   - 分块 APC 序列传输 (4096 字节/块)
 *   - 基于 tmux DCS passthrough 包装
 *   - Unicode 占位符字符 + 变音符编码行/列索引
 *
 * 逆向: VQT.transmitImage, YQT.createPlaceholder, pIT
 *   in amp-cli-reversed/modules/1472_tui_components/misc_utils.js:1267-1378
 *   and amp-cli-reversed/modules/2453_unknown_Qd0.js:1-4 (pIT / imageId cycling)
 *   and amp-cli-reversed/modules/1472_tui_components/data_structures.js:74 (DIACRITICS / ly)
 *   and amp-cli-reversed/modules/0512_unknown_Ku0.js:1-4 (FP / tmux passthrough)
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

/**
 * Kitty 占位符基础码位 (U+10EEEE)。
 *
 * 逆向: YQT.createPlaceholder — String.fromCodePoint(1109742)
 * 1109742 decimal = 0x10EEEE hex
 *
 * 注意: 任务规范中标注为 0x10EFFE，但 amp 源码实际使用 1109742 (0x10EEEE)。
 * 以 amp 源码为准。
 */
export const PLACEHOLDER_BASE = 1109742; // 0x10EEEE

/**
 * 变音符码位表，用于编码占位符格网中的行和列索引。
 *
 * 逆向: ly in amp-cli-reversed/modules/1472_tui_components/data_structures.js:74
 * 这是 Unicode 组合变音符 (combining diacritics) 的子集，
 * Kitty 使用这些码位来向终端传递图像在格网中的行/列信息。
 */
export const DIACRITICS: readonly number[] = [
  773, 781, 782, 784, 786, 829, 830, 831, 838, 842, 843, 844, 848, 849, 850, 855, 859, 867, 868,
  869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 1155, 1156, 1157, 1158, 1159, 1426, 1427,
  1428, 1429, 1431, 1432, 1433, 1436, 1437, 1438, 1439, 1440, 1441, 1448, 1449, 1451, 1452, 1455,
  1476, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1559, 1623, 1624, 1625, 1626, 1627, 1629, 1630,
  1750, 1751, 1752, 1753, 1754, 1755, 1756, 1759, 1760, 1761, 1762, 1764, 1767, 1768, 1771, 1772,
  1840, 1842, 1843, 1845, 1846, 1850, 1853, 1855, 1856, 1857, 1859, 1861, 1863, 1865, 1866, 2027,
  2028, 2029, 2030, 2031, 2032, 2033, 2035, 2070, 2071, 2072, 2073, 2075, 2076, 2077, 2078, 2079,
  2080, 2081, 2082, 2083, 2085, 2086, 2087, 2089, 2090, 2091, 2092, 2093, 2385, 2387, 2388, 3970,
  3971, 3974, 3975, 4957, 4958, 4959, 6109, 6458, 6679, 6773, 6774, 6775, 6776, 6777, 6778, 6779,
  6780, 7019, 7021, 7022, 7023, 7024, 7025, 7026, 7027, 7376, 7377, 7378, 7386, 7387, 7392, 7616,
  7617, 7619, 7620, 7621, 7622, 7623, 7624, 7625, 7627, 7628, 7633, 7634, 7635, 7636, 7637, 7638,
  7639, 7640, 7641, 7642, 7643, 7644, 7645, 7646, 7647, 7648, 7649, 7650, 7651, 7652, 7653, 7654,
  7678, 8400, 8401, 8404, 8405, 8406, 8407, 8411, 8412, 8417, 8423, 8425, 8432, 11503, 11504, 11505,
  11744, 11745, 11746, 11747, 11748, 11749, 11750, 11751, 11752, 11753, 11754, 11755, 11756, 11757,
  11758, 11759, 11760, 11761, 11762, 11763, 11764, 11765, 11766, 11767, 11768, 11769, 11770, 11771,
  11772, 11773, 11774, 11775, 42607, 42620, 42621, 42736, 42737, 43232, 43233, 43234, 43235, 43236,
  43237, 43238, 43239, 43240, 43241, 43242, 43243, 43244, 43245, 43246, 43247, 43248, 43249, 43696,
  43698, 43699, 43703, 43704, 43710, 43711, 43713, 65056, 65057, 65058, 65059, 65060, 65061, 65062,
];

/**
 * APC 序列分块大小 (字节)。
 *
 * 逆向: VQT.transmitImage — let h = 4096
 */
export const CHUNK_SIZE = 4096;

// ════════════════════════════════════════════════════
//  tmux passthrough
// ════════════════════════════════════════════════════

/**
 * 如果当前在 tmux 会话内，将 APC 序列包装为 DCS passthrough。
 *
 * tmux 会拦截 APC (\x1b_...\x1b\\) 序列，需要通过
 * DCS 透传 (\x1bPtmux;...\x1b\\) 才能转发到真实终端。
 * 在 DCS 内部，所有 ESC 字节需要双写 (\x1b → \x1b\x1b)。
 *
 * 逆向: FP(T) in amp-cli-reversed/modules/0512_unknown_Ku0.js:1-4
 * ```js
 * function FP(T) {
 *   if (!Xb()) return T;
 *   return `\x1BPtmux;${T.replace(/\x1b/g, "\x1B\x1B")}\x1B\\`;
 * }
 * ```
 *
 * @param seq - 原始 APC 序列字符串
 * @param inTmux - 是否在 tmux 会话内
 * @returns 包装后（或原始）序列字符串
 */
export function wrapForTmux(seq: string, inTmux: boolean): string {
  if (!inTmux) return seq;
  return `\x1bPtmux;${seq.replace(/\x1b/g, "\x1b\x1b")}\x1b\\`;
}

// ════════════════════════════════════════════════════
//  Kitty Graphics APC encode
// ════════════════════════════════════════════════════

/**
 * 传输选项。
 */
export interface KittyTransmitOpts {
  /** 图像 ID (1-255) */
  id: number;
  /** 终端列数 */
  cols: number;
  /** 终端行数 */
  rows: number;
  /** 是否在 tmux 内（默认 false） */
  inTmux?: boolean;
}

/**
 * 将 PNG base64 数据编码为 Kitty Graphics APC 传输序列（分块）。
 *
 * 协议格式:
 * - 首块: `\x1b_Gq=2,a=T,U=1,f=100,i=<id>,c=<cols>,r=<rows>,m=<more>;<data>\x1b\\`
 * - 后续块: `\x1b_Gm=<more>;<data>\x1b\\`
 *
 * 其中 `m=1` 表示还有更多块，`m=0` 表示最后一块。
 *
 * 逆向: VQT.transmitImage (misc_utils.js:1286-1296)
 * ```js
 * for (let c = 0; c < i.length; c++) {
 *   let s = i[c], A = c === i.length - 1 ? 0 : 1;
 *   if (c === 0) r += FP(`\x1B_Gq=2,a=T,U=1,f=100,i=${e},c=${R},r=${a},m=${A};${s}\x1B\\`);
 *   else r += FP(`\x1B_Gm=${A};${s}\x1B\\`);
 * }
 * ```
 *
 * @param base64Data - PNG 图像的 base64 编码字符串
 * @param opts - 传输选项（id, cols, rows, inTmux）
 * @returns 完整的 APC 传输序列字符串
 */
export function encodeKittyGraphicsTransmit(base64Data: string, opts: KittyTransmitOpts): string {
  const { id, cols, rows, inTmux = false } = opts;
  const chunks: string[] = [];
  for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
    chunks.push(base64Data.slice(i, i + CHUNK_SIZE));
  }

  // Edge case: empty data produces one empty chunk for a valid (if useless) transmission
  if (chunks.length === 0) {
    chunks.push("");
  }

  let result = "";
  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c]!;
    const more = c === chunks.length - 1 ? 0 : 1;
    let seq: string;
    if (c === 0) {
      seq = `\x1b_Gq=2,a=T,U=1,f=100,i=${id},c=${cols},r=${rows},m=${more};${chunk}\x1b\\`;
    } else {
      seq = `\x1b_Gm=${more};${chunk}\x1b\\`;
    }
    result += wrapForTmux(seq, inTmux);
  }

  return result;
}

/**
 * 生成 Kitty Graphics 删除图像序列。
 *
 * 逆向: VQT.deleteImage (misc_utils.js:1298-1299)
 * ```js
 * process.stdout.write(FP(`\x1B_Ga=d,d=I,i=${this.imageId}\x1B\\`))
 * ```
 *
 * @param imageId - 要删除的图像 ID
 * @param inTmux - 是否在 tmux 内（默认 false）
 * @returns APC 删除序列字符串
 */
export function encodeKittyGraphicsDelete(imageId: number, inTmux = false): string {
  const seq = `\x1b_Ga=d,d=I,i=${imageId}\x1b\\`;
  return wrapForTmux(seq, inTmux);
}

// ════════════════════════════════════════════════════
//  Placeholder grid
// ════════════════════════════════════════════════════

/**
 * 占位符格网单元格。
 *
 * 每个终端格子对应一个占位符字符串（基础码位 + 行变音符 + 列变音符），
 * 以及所属图像的 ID（通过前景色索引传递给终端）。
 */
export interface PlaceholderCell {
  /**
   * 占位符字符串：
   * PLACEHOLDER_BASE (U+10EFFE) + 行变音符 + 列变音符
   */
  char: string;
  /** 图像 ID (1-255) */
  imageId: number;
}

/**
 * 构造 Kitty 图像占位符格网。
 *
 * 每个格子包含:
 * - U+10EFFE (PLACEHOLDER_BASE)
 * - 行索引对应的变音符 (DIACRITICS[row % len])
 * - 列索引对应的变音符 (DIACRITICS[col % len])
 *
 * 终端通过前景色 `index` 值获取图像 ID，通过变音符确定该格子在
 * 图像中的行/列位置，从而正确渲染图像的对应区域。
 *
 * 逆向: YQT.createPlaceholder (misc_utils.js:1374-1378)
 * ```js
 * createPlaceholder(T, R) {
 *   let a = ly[T % ly.length] ?? ly[0],
 *       e = ly[R % ly.length] ?? ly[0];
 *   return String.fromCodePoint(1109742)
 *     + String.fromCodePoint(a)
 *     + String.fromCodePoint(e);
 * }
 * ```
 *
 * @param cols - 格网列数
 * @param rows - 格网行数
 * @param imageId - 图像 ID
 * @returns 二维 PlaceholderCell 数组 [row][col]
 */
export function buildPlaceholderGrid(
  cols: number,
  rows: number,
  imageId: number,
): PlaceholderCell[][] {
  const grid: PlaceholderCell[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowCells: PlaceholderCell[] = [];
    for (let col = 0; col < cols; col++) {
      const rowDiacritic = DIACRITICS[row % DIACRITICS.length] ?? DIACRITICS[0]!;
      const colDiacritic = DIACRITICS[col % DIACRITICS.length] ?? DIACRITICS[0]!;
      const char =
        String.fromCodePoint(PLACEHOLDER_BASE) +
        String.fromCodePoint(rowDiacritic) +
        String.fromCodePoint(colDiacritic);
      rowCells.push({ char, imageId });
    }
    grid.push(rowCells);
  }
  return grid;
}

// ════════════════════════════════════════════════════
//  Image ID allocator
// ════════════════════════════════════════════════════

/**
 * 全局图像 ID 计数器（模块级状态），范围 1-255，循环分配。
 *
 * 逆向: zF variable + pIT() in amp-cli-reversed/modules/2453_unknown_Qd0.js:1-4
 * ```js
 * function pIT() {
 *   let T = zF;
 *   return zF = zF % 255 + 1, T;
 * }
 * ```
 * 注意: zF 初始值不在该模块，但循环逻辑保证 ID 在 [1, 255] 范围内。
 */
let _nextImageId = 1;

/**
 * 分配下一个图像 ID (1-255，循环)。
 *
 * 逆向: pIT() in amp-cli-reversed/modules/2453_unknown_Qd0.js:1-4
 *
 * @returns 当前 ID（1-255），并将计数器推进到下一个值
 */
export function allocateImageId(): number {
  const id = _nextImageId;
  _nextImageId = (_nextImageId % 255) + 1;
  return id;
}
