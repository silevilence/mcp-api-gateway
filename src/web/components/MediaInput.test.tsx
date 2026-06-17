// ============================================================
// MediaInput 单元测试
// ============================================================
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaInput } from './MediaInput.js';

// mock toast
vi.mock('./Toast.js', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('MediaInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    accept: 'image/*' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- 渲染 ----
  it('renders URL mode by default with text input', () => {
    render(<MediaInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/URL/i);
    expect(input).toBeDefined();
    expect(input.tagName).toBe('INPUT');
  });

  it('renders three mode tabs', () => {
    render(<MediaInput {...defaultProps} />);
    expect(screen.getByText('🔗 URL')).toBeDefined();
    expect(screen.getByText('📁 本地文件')).toBeDefined();
    expect(screen.getByText('📋 剪贴板')).toBeDefined();
  });

  // ---- URL 模式 ----
  it('calls onChange with valid HTTP URL on blur', () => {
    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/URL/i);
    fireEvent.change(input, { target: { value: 'https://example.com/photo.png' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('https://example.com/photo.png');
  });

  it('calls onChange with valid data: URL on blur', () => {
    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/URL/i);
    fireEvent.change(input, { target: { value: 'data:image/png;base64,abc123' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('data:image/png;base64,abc123');
  });

  it('shows error for invalid URL format', async () => {
    render(<MediaInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/URL/i);
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的/)).toBeDefined();
    });
  });

  it('does not call onChange for invalid URL', async () => {
    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/URL/i);
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.blur(input);
    // onChange 不应被调用：输入无效 URL，仅更新本地 draft，不传播到父组件
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的/)).toBeDefined();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  // ---- 模式切换 ----
  it('switches to file mode and shows drop zone', () => {
    render(<MediaInput {...defaultProps} />);
    fireEvent.click(screen.getByText('📁 本地文件'));
    expect(screen.getByText(/拖拽文件到此处/)).toBeDefined();
    expect(screen.getByText(/选择文件/)).toBeDefined();
  });

  it('switches to clipboard mode and shows paste hint', () => {
    render(<MediaInput {...defaultProps} />);
    fireEvent.click(screen.getByText('📋 剪贴板'));
    expect(screen.getByText(/Ctrl\+V/)).toBeDefined();
  });

  // ---- 文件模式 — MIME 校验 ----
  it('shows error when file type is rejected', async () => {
    render(<MediaInput {...defaultProps} />);
    fireEvent.click(screen.getByText('📁 本地文件'));

    const fileInput = screen.getByTestId('media-file-input');
    const badFile = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/不支持的文件类型/)).toBeDefined();
    });
  });

  // ---- 文件模式 — 大小校验 ----
  it('shows error when file exceeds maxSizeMB', async () => {
    render(<MediaInput {...defaultProps} maxSizeMB={1} />);
    fireEvent.click(screen.getByText('📁 本地文件'));

    const fileInput = screen.getByTestId('media-file-input');
    const largeFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/文件过大/)).toBeDefined();
    });
  });

  // ---- 文件模式 — 成功编码 ----
  it('encodes valid image to Base64 and calls onChange', async () => {
    const mockResult = 'data:image/png;base64,iVBORw0KGgo...';
    const originalFileReader = global.FileReader;

    const mockReaderInstance = {
      result: mockResult,
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onloadend: null as (() => void) | null,
      readAsDataURL: vi.fn(function (this: typeof mockReaderInstance) {
        // 模拟异步读取
        setTimeout(() => {
          this.onload?.();
          this.onloadend?.();
        }, 0);
      }),
    };

    global.FileReader = vi.fn(() => mockReaderInstance) as unknown as typeof FileReader;

    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('📁 本地文件'));

    const fileInput = screen.getByTestId('media-file-input');
    const validFile = new File(['fake-img'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(mockResult);
    });

    global.FileReader = originalFileReader;
  });

  // ---- 剪贴板模式 ----
  it('handles paste with media Blob and encodes it', async () => {
    const mockResult = 'data:image/png;base64,clipboard...';
    const originalFileReader = global.FileReader;

    const mockReaderInstance = {
      result: mockResult,
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onloadend: null as (() => void) | null,
      readAsDataURL: vi.fn(function (this: typeof mockReaderInstance) {
        setTimeout(() => {
          this.onload?.();
          this.onloadend?.();
        }, 0);
      }),
    };

    global.FileReader = vi.fn(() => mockReaderInstance) as unknown as typeof FileReader;

    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('📋 剪贴板'));

    const pasteZone = screen.getByTestId('media-clipboard-zone');
    const blob = new Blob(['fake-img'], { type: 'image/png' });
    const file = new File([blob], 'clipboard.png', { type: 'image/png' });
    const clipboardData = {
      items: [
        { kind: 'file', type: 'image/png', getAsFile: () => file },
      ] as unknown as DataTransferItemList,
      files: [file] as unknown as FileList,
    };

    fireEvent.paste(pasteZone, { clipboardData: clipboardData as unknown as DataTransfer });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(mockResult);
    });

    global.FileReader = originalFileReader;
  });

  it('ignores paste with text-only clipboard data', () => {
    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('📋 剪贴板'));

    const pasteZone = screen.getByTestId('media-clipboard-zone');
    fireEvent.paste(pasteZone, {
      clipboardData: {
        items: [{ kind: 'string', type: 'text/plain' }] as unknown as DataTransferItemList,
        files: [] as unknown as FileList,
      } as unknown as DataTransfer,
    });

    // onChange 不应被调用（无媒体数据）
    expect(onChange).not.toHaveBeenCalled();
  });

  // ---- 拖拽 hover 样式 ----
  it('shows drag-over accent border when dragging over drop zone', () => {
    render(<MediaInput {...defaultProps} />);
    fireEvent.click(screen.getByText('📁 本地文件'));

    const dropZone = screen.getByTestId('media-drop-zone');
    fireEvent.dragOver(dropZone);

    // 检查 border 颜色变化
    expect(dropZone.style.border).toContain('var(--accent)');
  });

  // ---- disabled 状态 ----
  it('disables URL input when disabled prop is true', () => {
    render(<MediaInput {...defaultProps} disabled />);
    const input = screen.getByPlaceholderText(/URL/i);
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  // ---- 预览 ----
  it('shows image preview when value is a data: URL', () => {
    render(<MediaInput {...defaultProps} value="data:image/png;base64,abc123" />);
    const img = screen.getByAltText('预览');
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toBe('data:image/png;base64,abc123');
  });

  // ---- 清除按钮 ----
  it('calls onChange with empty string when clear button clicked', () => {
    const onChange = vi.fn();
    render(<MediaInput {...defaultProps} value="data:image/png;base64,abc123" onChange={onChange} />);
    fireEvent.click(screen.getByText('清除'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  // ---- 视频 accept ----
  it('shows video-specific UI when accept is video/*', () => {
    render(<MediaInput {...defaultProps} accept="video/*" />);
    const input = screen.getByPlaceholderText(/视频/);
    expect(input).toBeDefined();
  });
});
