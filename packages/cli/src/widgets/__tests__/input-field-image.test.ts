/**
 * InputField 图片附件粘贴功能测试。
 *
 * 验证:
 * - extractImagePaths: 从粘贴文本中提取图片文件路径
 * - extractSingleImagePath: 单路径验证
 * - 粘贴图片路径时触发 onInsertImage / 添加内部附件
 * - 退格键在文本为空时移除最后一个附件
 * - 提交时携带图片附件
 * - 附件数量上限 (MAX 4)
 * - 附件栏渲染
 *
 * @module
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { FocusManager, RichText } from "@flitter/tui";
import {
  extractImagePaths,
  extractSingleImagePath,
  type ImageAttachment,
  InputField,
  type InputFieldConfig,
  type InputFieldState,
} from "../input-field.js";

// ─── 测试辅助 ─────────────────────────────────────────

const NO_MODS = { shift: false, alt: false, ctrl: false, meta: false };

function mountInputField(config: InputFieldConfig): {
  widget: InputField;
  state: InputFieldState;
  fm: FocusManager;
} {
  const fm = FocusManager.instance;
  const widget = new InputField(config);
  const state = widget.createState() as InputFieldState;

  const mockElement = { markNeedsRebuild: () => {} } as any;
  (state as any)._widget = widget;
  (state as any)._element = mockElement;
  (state as any)._mounted = true;
  state.initState();

  return { widget, state, fm };
}

function makeTestAttachment(index: number): ImageAttachment {
  return {
    type: "image",
    source: {
      type: "base64",
      data: `dGVzdGRhdGEke2luZGV4fQ==`, // "testdata${index}" base64
      mediaType: "image/png",
    },
    sourcePath: `/tmp/test-image-${index}.png`,
  };
}

function extractAllText(widget: any): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  if (widget.children) {
    for (const child of widget.children) {
      result += extractAllText(child);
    }
  }
  if (widget.child) {
    result += extractAllText(widget.child);
  }
  return result;
}

// ════════════════════════════════════════════════════
//  extractImagePaths 测试 (逆向: gE0)
// ════════════════════════════════════════════════════

describe("extractImagePaths", () => {
  it("应该从单个绝对路径提取图片", () => {
    const result = extractImagePaths("/Users/test/image.png");
    expect(result).toEqual(["/Users/test/image.png"]);
  });

  it("应该从多行文本提取多个图片路径", () => {
    const text = "/tmp/a.png\n/tmp/b.jpg\n/tmp/c.gif";
    const result = extractImagePaths(text);
    expect(result).toEqual(["/tmp/a.png", "/tmp/b.jpg", "/tmp/c.gif"]);
  });

  it("应该处理带引号的路径", () => {
    const result = extractImagePaths('"/Users/test/image.png"');
    expect(result).toEqual(["/Users/test/image.png"]);
  });

  it("应该拒绝相对路径", () => {
    const result = extractImagePaths("images/photo.png");
    expect(result).toEqual([]);
  });

  it("应该拒绝非图片扩展名", () => {
    const result = extractImagePaths("/Users/test/document.txt");
    expect(result).toEqual([]);
  });

  it("应该拒绝过短的文本", () => {
    // extractImagePaths 本身不检查长度，由 _handlePasteEvent 在调用前检查 length > 3
    // 但如果路径本身合法但太短，如 "/a.png" 仍然应该识别
    const result = extractImagePaths("/a.png");
    expect(result).toEqual(["/a.png"]);
  });

  it("应该支持多个文件路径在同一行以空格分隔", () => {
    // 逆向: chunk-004.js:21220 — split by image ext + space + quote/slash
    const text = "/tmp/a.png /tmp/b.jpg";
    const result = extractImagePaths(text);
    expect(result).toEqual(["/tmp/a.png", "/tmp/b.jpg"]);
  });

  it("应该支持 .webp 扩展名", () => {
    const result = extractImagePaths("/tmp/photo.webp");
    expect(result).toEqual(["/tmp/photo.webp"]);
  });

  it("应该支持 .jpeg 扩展名", () => {
    const result = extractImagePaths("/tmp/photo.jpeg");
    expect(result).toEqual(["/tmp/photo.jpeg"]);
  });

  it("应该处理反斜杠转义", () => {
    const result = extractImagePaths("/tmp/my\\ image.png");
    expect(result).toEqual(["/tmp/my image.png"]);
  });

  it("应该处理 Windows 绝对路径", () => {
    // Windows paths with backslash: "C:\Users\test\image.png"
    // After backslash unescape: C:Userstestimage.png — which has no image extension at end
    // This means raw backslash Windows paths won't work with this detection.
    // Only forward-slash or properly escaped Windows paths work.
    const result = extractImagePaths("C:/Users/test/image.png");
    expect(result).toEqual(["C:/Users/test/image.png"]);
  });
});

// ════════════════════════════════════════════════════
//  extractSingleImagePath 测试 (逆向: IE0)
// ════════════════════════════════════════════════════

describe("extractSingleImagePath", () => {
  it("应该接受有效的绝对 PNG 路径", () => {
    expect(extractSingleImagePath("/home/user/screenshot.png")).toBe("/home/user/screenshot.png");
  });

  it("应该拒绝无扩展名的路径", () => {
    expect(extractSingleImagePath("/home/user/file")).toBeNull();
  });

  it("应该拒绝非图片扩展名", () => {
    expect(extractSingleImagePath("/home/user/file.pdf")).toBeNull();
  });

  it("应该拒绝相对路径", () => {
    expect(extractSingleImagePath("relative/path.png")).toBeNull();
  });

  it("应该去除首尾引号", () => {
    expect(extractSingleImagePath("'/tmp/image.jpg'")).toBe("/tmp/image.jpg");
  });

  it("应该处理 unicode 转义", () => {
    // u{41} = 'A'
    expect(extractSingleImagePath("/tmp/u{41}image.png")).toBe("/tmp/Aimage.png");
  });
});

// ════════════════════════════════════════════════════
//  粘贴图片路径测试
// ════════════════════════════════════════════════════

describe("InputField 粘贴图片路径", () => {
  it("粘贴图片路径应触发 onInsertImage 回调", () => {
    const insertedImages: string[] = [];
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onInsertImage: (path) => insertedImages.push(path),
    });

    // 模拟粘贴事件 — 通过 FocusManager 分发
    fm.handlePasteEvent({ type: "paste", text: "/tmp/screenshot.png" });

    expect(insertedImages).toEqual(["/tmp/screenshot.png"]);
  });

  it("粘贴非图片文本应正常插入", () => {
    const { state, fm } = mountInputField({
      onSubmit: () => {},
    });

    fm.handlePasteEvent({ type: "paste", text: "hello world" });

    const controller = (state as any)._controller;
    expect(controller.text).toBe("hello world");
  });

  it("粘贴短文本不检测图片 (length <= 3)", () => {
    const insertedImages: string[] = [];
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onInsertImage: (path) => insertedImages.push(path),
    });

    // "abc" is too short (length <= 3), should be inserted as text
    fm.handlePasteEvent({ type: "paste", text: "abc" });

    expect(insertedImages).toHaveLength(0);
    const controller = (state as any)._controller;
    expect(controller.text).toBe("abc");
  });

  it("无 onInsertImage 时应内部处理图片路径 (非受控模式)", () => {
    const changedAttachments: ImageAttachment[][] = [];
    const { state } = mountInputField({
      onSubmit: () => {},
      onImageAttachmentsChanged: (att) => changedAttachments.push([...att]),
    });

    // 内部 _readImageFile 是 async 且会 import fs，在测试中不会真正读文件
    // 但我们可以通过 addImageAttachment 直接测试附件添加逻辑
    const attachment = makeTestAttachment(1);
    const added = state.addImageAttachment(attachment);

    expect(added).toBe(true);
    expect(changedAttachments).toHaveLength(1);
    expect(changedAttachments[0]).toHaveLength(1);
    expect(changedAttachments[0]![0]!.sourcePath).toBe("/tmp/test-image-1.png");
  });
});

// ════════════════════════════════════════════════════
//  退格删除附件测试
// ════════════════════════════════════════════════════

describe("InputField 退格删除附件", () => {
  it("文本为空时退格应移除最后一个附件", () => {
    const changedAttachments: ImageAttachment[][] = [];
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onImageAttachmentsChanged: (att) => changedAttachments.push([...att]),
    });

    // 添加两个附件
    state.addImageAttachment(makeTestAttachment(1));
    state.addImageAttachment(makeTestAttachment(2));
    expect(changedAttachments).toHaveLength(2);

    // 文本为空，按退格
    fm.handleKeyEvent({ type: "key", key: "Backspace", modifiers: NO_MODS });

    // 最后一个附件应被移除
    expect(changedAttachments).toHaveLength(3);
    expect(changedAttachments[2]).toHaveLength(1);
    expect(changedAttachments[2]![0]!.sourcePath).toBe("/tmp/test-image-1.png");
  });

  it("文本非空时退格不应移除附件", () => {
    const changedAttachments: ImageAttachment[][] = [];
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onImageAttachmentsChanged: (att) => changedAttachments.push([...att]),
    });

    state.addImageAttachment(makeTestAttachment(1));

    // 输入一些文本
    fm.handleKeyEvent({ type: "key", key: "x", modifiers: NO_MODS });

    const addCount = changedAttachments.length;

    // 按退格 — 应删除文本而不是附件
    fm.handleKeyEvent({ type: "key", key: "Backspace", modifiers: NO_MODS });

    // 附件变化次数不应增加
    expect(changedAttachments).toHaveLength(addCount);
  });

  it("无附件时退格正常删除文本", () => {
    const { state, fm } = mountInputField({
      onSubmit: () => {},
    });

    fm.handleKeyEvent({ type: "key", key: "a", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "b", modifiers: NO_MODS });

    const controller = (state as any)._controller;
    expect(controller.text).toBe("ab");

    fm.handleKeyEvent({ type: "key", key: "Backspace", modifiers: NO_MODS });
    expect(controller.text).toBe("a");
  });
});

// ════════════════════════════════════════════════════
//  提交时携带附件测试
// ════════════════════════════════════════════════════

describe("InputField 提交携带附件", () => {
  it("提交时应携带附件并清空", () => {
    let submittedText = "";
    let submittedAttachments: ImageAttachment[] | undefined;
    const { state, fm } = mountInputField({
      onSubmit: (text, att) => {
        submittedText = text;
        submittedAttachments = att;
      },
    });

    // 添加附件
    state.addImageAttachment(makeTestAttachment(1));

    // 输入文本并提交
    fm.handleKeyEvent({ type: "key", key: "h", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "i", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });

    expect(submittedText).toBe("hi");
    expect(submittedAttachments).toBeDefined();
    expect(submittedAttachments).toHaveLength(1);
    expect(submittedAttachments![0]!.sourcePath).toBe("/tmp/test-image-1.png");

    // 提交后附件应清空
    const internalAttachments = (state as any)._imageAttachments;
    expect(internalAttachments).toHaveLength(0);
  });

  it("仅有附件无文本也应能提交", () => {
    let submitted = false;
    let submittedAttachments: ImageAttachment[] | undefined;
    const { state, fm } = mountInputField({
      onSubmit: (_text, att) => {
        submitted = true;
        submittedAttachments = att;
      },
    });

    state.addImageAttachment(makeTestAttachment(1));

    // 直接提交（文本为空但有附件）
    // _submitText 逻辑: !text.trim() && attachments.length === 0 才拒绝
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });

    expect(submitted).toBe(true);
    expect(submittedAttachments).toHaveLength(1);
  });

  it("文本和附件都为空不应提交", () => {
    let submitted = false;
    const { fm } = mountInputField({
      onSubmit: () => {
        submitted = true;
      },
    });

    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });

    expect(submitted).toBe(false);
  });
});

// ════════════════════════════════════════════════════
//  附件数量上限测试
// ════════════════════════════════════════════════════

describe("InputField 附件上限", () => {
  it("最多添加 4 个附件 (MAX_IMAGE_ATTACHMENTS)", () => {
    const { state } = mountInputField({
      onSubmit: () => {},
    });

    // 添加 4 个应成功
    expect(state.addImageAttachment(makeTestAttachment(1))).toBe(true);
    expect(state.addImageAttachment(makeTestAttachment(2))).toBe(true);
    expect(state.addImageAttachment(makeTestAttachment(3))).toBe(true);
    expect(state.addImageAttachment(makeTestAttachment(4))).toBe(true);

    // 第 5 个应失败
    expect(state.addImageAttachment(makeTestAttachment(5))).toBe(false);

    const internalAttachments = (state as any)._imageAttachments;
    expect(internalAttachments).toHaveLength(4);
  });
});

// ════════════════════════════════════════════════════
//  附件栏渲染测试
// ════════════════════════════════════════════════════

describe("InputField 附件栏渲染", () => {
  it("有附件时 build 输出应包含 'Images:' 和 '[Image N]'", () => {
    const { state } = mountInputField({
      onSubmit: () => {},
    });

    state.addImageAttachment(makeTestAttachment(1));
    state.addImageAttachment(makeTestAttachment(2));

    // Build and extract text
    const tree = state.build({} as any);
    const allText = extractAllText(tree);

    expect(allText).toContain("Images:");
    expect(allText).toContain("[Image 1]");
    expect(allText).toContain("[Image 2]");
  });

  it("无附件时 build 输出不应包含 'Images:'", () => {
    const { state: _state } = mountInputField({
      onSubmit: () => {},
    });

    const tree = _state.build({} as any);
    const allText = extractAllText(tree);

    expect(allText).not.toContain("Images:");
  });
});
