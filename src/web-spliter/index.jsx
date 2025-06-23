import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./styles.module.css";

const LOCAL_STORAGE_KEYS = {
  LEFT_URL: "webSplitter_leftUrl",
  RIGHT_URL: "webSplitter_rightUrl",
  DIVIDER: "webSplitter_dividerPosition",
};

export default function WebSplitter() {
  const [leftUrl, setLeftUrl] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.LEFT_URL) ||
      "https://about.google"
  );
  const [rightUrl, setRightUrl] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.RIGHT_URL) ||
      "https://about.google"
  );
  const [dividerPosition, setDividerPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const leftIframeRef = useRef(null);
  const rightIframeRef = useRef(null);
  const requestRef = useRef();

  // Use requestAnimationFrame for smooth dragging
  const animateDivider = useCallback((position) => {
    if (leftIframeRef.current && rightIframeRef.current) {
      leftIframeRef.current.style.width = `${position}%`;
      rightIframeRef.current.style.width = `${100 - position}%`;
    }
    requestRef.current = requestAnimationFrame(() => {});
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!containerRef.current || !isDragging) return;

      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const newPosition = Math.max(10, Math.min(90, percent));

      // Update visual position immediately
      animateDivider(newPosition);

      // Debounce state update to prevent excessive re-renders
      setDividerPosition(newPosition);
    },
    [isDragging, animateDivider]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    cancelAnimationFrame(requestRef.current);
  }, [handleMouseMove]);

  const startDragging = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp]
  );

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEFT_URL, leftUrl);
  }, [leftUrl]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RIGHT_URL, rightUrl);
  }, [rightUrl]);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.DIVIDER,
      dividerPosition.toString()
    );
  }, [dividerPosition]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Header component for each side
  const Header = ({ url, setUrl }) => (
    <div className={styles.header}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className={styles.urlInput}
      />
    </div>
  );

  // Iframe renderer component for each side
  const URLRenderer = ({ url, width, iframeRef }) => (
    <iframe
      ref={iframeRef}
      src={url}
      title="Web Preview"
      className={styles.iframe}
      style={{ width: `${width}%` }}
      frameBorder="0"
    />
  );

  // Wrapper component for each side
  const Wrapper = ({ children, side }) => (
    <div
      className={styles.sideWrapper}
      style={{
        width:
          side === "left" ? `${dividerPosition}%` : `${100 - dividerPosition}%`,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Left side */}
      <Wrapper side="left">
        <Header url={leftUrl} setUrl={setLeftUrl} />
        <URLRenderer url={leftUrl} width={100} iframeRef={leftIframeRef} />
      </Wrapper>

      {/* Divider */}
      <div
        className={`${styles.divider} ${isDragging ? styles.dragging : ""}`}
        onMouseDown={startDragging}
      />

      {/* Right side */}
      <Wrapper side="right">
        <Header url={rightUrl} setUrl={setRightUrl} />
        <URLRenderer url={rightUrl} width={100} iframeRef={rightIframeRef} />
      </Wrapper>
    </div>
  );
}
