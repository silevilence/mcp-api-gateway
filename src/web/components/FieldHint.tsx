// ============================================================
// 字段提示组件 · Portal tooltip（不受父容器 overflow 裁切）
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface FieldHintProps {
  text: string;
}

const iconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: '#d1d5db',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  marginLeft: 6,
  cursor: 'help',
  lineHeight: 1,
  verticalAlign: 'middle',
  flexShrink: 0,
};

const GAP = 6;
const TOOLTIP_MAX_W = 320;
const TOOLTIP_MIN_W = 200;

function computePos(iconRect: DOMRect): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = iconRect.left + iconRect.width / 2;
  const aboveRoom = iconRect.top;
  const belowRoom = vh - iconRect.bottom;

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    background: '#1f2937',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.55,
    whiteSpace: 'normal',
    minWidth: TOOLTIP_MIN_W,
    maxWidth: TOOLTIP_MAX_W,
    pointerEvents: 'none',
    textAlign: 'left',
    wordBreak: 'normal',
    overflowWrap: 'anywhere',
  };

  // 水平：优先居中，超出视口则贴边
  const halfW = Math.min(TOOLTIP_MAX_W / 2, TOOLTIP_MAX_W / 2);
  let left = cx - halfW;
  if (left < 8) left = 8;
  if (left + TOOLTIP_MAX_W > vw - 8) left = vw - TOOLTIP_MAX_W - 8;
  style.left = left;

  // 垂直：优先上方，空间不够则下方
  if (aboveRoom > 60) {
    style.bottom = vh - iconRect.top + GAP;
  } else if (belowRoom > 60) {
    style.top = iconRect.bottom + GAP;
  } else {
    // 都不够就固定在视口中间
    style.top = Math.max(8, vh / 2 - 30);
  }

  return style;
}

export const FieldHint: React.FC<FieldHintProps> = ({ text }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const iconRef = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPos(computePos(rect));
    }
    setShow(true);
  }, []);

  const handleLeave = useCallback(() => {
    setShow(false);
  }, []);

  return (
    <>
      <span
        ref={iconRef}
        style={iconStyle}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        ?
      </span>
      {show &&
        createPortal(
          <span style={pos}>{text}</span>,
          document.body,
        )}
    </>
  );
};
