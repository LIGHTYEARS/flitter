import fs from 'fs';

const buffer = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted_bun.bin');
const start = buffer.indexOf('// @bun');
const endStr = 'export default kF0();';
const end = buffer.indexOf(endStr);

if (start !== -1 && end !== -1) {
  const finalEnd = end + endStr.length;
  console.log("Start:", start, "End:", finalEnd, "Length:", finalEnd - start);
  fs.writeFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', buffer.slice(start, finalEnd));
} else {
  console.log("Not found! start:", start, "end:", end);
}
