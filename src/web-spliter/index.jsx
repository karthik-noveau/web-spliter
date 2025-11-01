import { useState, useRef, useEffect, useCallback, memo } from "react";
import styles from "./styles.module.css";

const LOCAL_STORAGE_KEYS = {
  LEFT_URL: "webSplitter_leftUrl",
  RIGHT_URL: "webSplitter_rightUrl",
  DIVIDER: "webSplitter_dividerPosition",
};

// Smart URL/Search processor - works like a real browser
const processInput = (input) => {
  if (!input || !input.trim()) return input;

  const trimmed = input.trim();

  // Check if it already has a protocol
  if (trimmed.match(/^(https?|ftp):\/\//i)) {
    return trimmed;
  }

  // Check if it looks like a URL (has domain extension)
  const urlPattern = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/;
  const hasSpaces = /\s/.test(trimmed);
  const hasDot = /\./.test(trimmed);

  // If it has spaces, treat as search query
  if (hasSpaces) {
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  // If it looks like a domain (has dot and matches pattern), add https://
  if (hasDot && urlPattern.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // If it's a single word without dots, could be:
  // - localhost
  // - search term
  if (trimmed === "localhost" || trimmed.startsWith("localhost:")) {
    return `http://${trimmed}`;
  }

  // Otherwise treat as search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
};

// Header component for each side
const Header = memo(({ inputValue, setInputValue, setUrl }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const processedUrl = processInput(inputValue);
      setUrl(processedUrl);
      setInputValue(processedUrl); // Update input to show processed URL
    }
  };

  return (
    <div className={styles.header}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search or enter URL"
        className={styles.urlInput}
      />
    </div>
  );
});
Header.displayName = "Header";

// Iframe renderer component for each side
const URLRenderer = memo(({ url, iframeRef }) => {
  return (
    <div className={styles.iframeContainer}>
      <iframe
        ref={iframeRef}
        src={url}
        title="Web Preview"
        className={styles.iframe}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
});
URLRenderer.displayName = "URLRenderer";

// Wrapper component for each side
const Wrapper = memo(({ children, wrapperRef }) => (
  <div ref={wrapperRef} className={styles.sideWrapper}>
    {children}
  </div>
));
Wrapper.displayName = "Wrapper";

export default function WebSplitter() {
  const [leftUrl, setLeftUrl] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.LEFT_URL) ||
      "https://about.google.com"
  );
  const [rightUrl, setRightUrl] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.RIGHT_URL) ||
      "https://blog.google/intl/en-in/"
  );
  const [leftInputValue, setLeftInputValue] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.LEFT_URL) ||
      "https://about.google.com"
  );
  const [rightInputValue, setRightInputValue] = useState(
    () =>
      localStorage.getItem(LOCAL_STORAGE_KEYS.RIGHT_URL) ||
      "https://blog.google/intl/en-in/"
  );
  const [dividerPosition, setDividerPosition] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.DIVIDER);
    return saved ? parseFloat(saved) : 50;
  });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const leftIframeRef = useRef(null);
  const rightIframeRef = useRef(null);
  const leftWrapperRef = useRef(null);
  const rightWrapperRef = useRef(null);
  const dragPositionRef = useRef(dividerPosition);

  // Update widths using refs for smooth dragging without re-renders
  const updateDividerPosition = useCallback((position) => {
    if (leftWrapperRef.current && rightWrapperRef.current) {
      leftWrapperRef.current.style.width = `${position}%`;
      rightWrapperRef.current.style.width = `${100 - position}%`;
    }
    dragPositionRef.current = position;
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const newPosition = Math.max(10, Math.min(90, percent));

      // Update visual position immediately using refs (no re-render)
      updateDividerPosition(newPosition);
    },
    [updateDividerPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    // Update state only once at the end for localStorage persistence
    setDividerPosition(dragPositionRef.current);

    // Re-enable pointer events on iframes
    if (leftIframeRef.current && rightIframeRef.current) {
      leftIframeRef.current.style.pointerEvents = "";
      rightIframeRef.current.style.pointerEvents = "";
    }
  }, [handleMouseMove]);

  const startDragging = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = "col-resize";

      // Disable pointer events on iframes during drag to prevent interference
      if (leftIframeRef.current && rightIframeRef.current) {
        leftIframeRef.current.style.pointerEvents = "none";
        rightIframeRef.current.style.pointerEvents = "none";
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp]
  );

  const handleDividerDoubleClick = useCallback(() => {
    // Center the divider at 50%
    const centerPosition = 50;
    updateDividerPosition(centerPosition);
    setDividerPosition(centerPosition);
  }, [updateDividerPosition]);

  const handleSwap = useCallback(() => {
    // Swap URLs only (keep divider position unchanged)
    const tempUrl = leftUrl;
    setLeftUrl(rightUrl);
    setRightUrl(tempUrl);

    // Swap input values
    const tempInput = leftInputValue;
    setLeftInputValue(rightInputValue);
    setRightInputValue(tempInput);
  }, [leftUrl, rightUrl, leftInputValue, rightInputValue]);

  // Initialize wrapper widths on mount
  useEffect(() => {
    if (leftWrapperRef.current && rightWrapperRef.current) {
      leftWrapperRef.current.style.width = `${dividerPosition}%`;
      rightWrapperRef.current.style.width = `${100 - dividerPosition}%`;
      dragPositionRef.current = dividerPosition;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEFT_URL, leftUrl);
    setLeftInputValue(leftUrl);
  }, [leftUrl]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RIGHT_URL, rightUrl);
    setRightInputValue(rightUrl);
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
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Left side */}
      <Wrapper key="left-wrapper" wrapperRef={leftWrapperRef}>
        <Header
          key="left-header"
          inputValue={leftInputValue}
          setInputValue={setLeftInputValue}
          setUrl={setLeftUrl}
        />
        <URLRenderer
          key="left-iframe"
          url={leftUrl}
          iframeRef={leftIframeRef}
        />
      </Wrapper>

      {/* Divider */}
      <div
        className={`${styles.divider} ${isDragging ? styles.dragging : ""}`}
        onMouseDown={startDragging}
        onDoubleClick={handleDividerDoubleClick}
        title="Double-click to center"
      >
        <div className={styles.dividerLine} title="Double-click to center" />
        <div className={styles.dividerHandle} />
        <button
          className={styles.swapButton}
          onClick={(e) => {
            e.stopPropagation();
            handleSwap();
          }}
          title="Swap URLs"
        >
          ⇆
        </button>
      </div>

      {/* Right side */}
      <Wrapper key="right-wrapper" wrapperRef={rightWrapperRef}>
        <Header
          key="right-header"
          inputValue={rightInputValue}
          setInputValue={setRightInputValue}
          setUrl={setRightUrl}
        />
        <URLRenderer
          key="right-iframe"
          url={rightUrl}
          iframeRef={rightIframeRef}
        />
      </Wrapper>
    </div>
  );
}
