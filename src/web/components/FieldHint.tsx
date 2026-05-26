// ============================================================
// 字段提示组件 · Portal tooltip（不受父容器 overflow 裁切）
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface FieldHintProps {
  text: string;
}

const iconCss: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 16, height: 16, borderRadius: '50%',
  background: 'var(--bg-elevated)', color: 'var(--text-muted)',
  fontSize: 10, fontWeight: 700, marginLeft: 6, cursor: 'help',
  lineHeight: 1, verticalAlign: 'middle', flexShrink: 0,
  border: '1px solid var(--border-default)',
};

const GAP = 6;

function computePos(iconRect: DOMRect): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = iconRect.left + iconRect.width / 2;
  const belowRoom = vh - iconRect.bottom;
  const maxW = 320;

  const style: React.CSSProperties = {
    position: 'fixed', zIndex: 1000,
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    padding: '10px 14px', borderRadius: 'var(--radius-md)',
    fontSize: 12, fontWeight: 400, lineHeight: 1.55,
    whiteSpace: 'normal',
    maxWidth: maxW, minWidth: 200,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-default)',
    pointerEvents: 'none',
  };

  let left = cx - maxW / 2;
  if (left < 8) left = 8;
  if (left + maxW > vw - 8) left = vw - maxW - 8;
  style.left = left;

  if (belowRoom > 140) {
    style.top = iconRect.bottom + GAP;
  } else {
    style.bottom = vh - iconRect.top + GAP;
  }

  return style;
}

export const FieldHint: React.FC<FieldHintProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const iconRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = iconRef.current;
    if (!el) return;
    setPos(computePos(el.getBoundingClientRect()));
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  return (
    <>
      <span
        ref={iconRef}
        style={iconCss}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        ?
      </span>
      {visible &&
        createPortal(
          <div style={pos}>{text}</div>,
          document.body,
        )}
    </>
  );
};
