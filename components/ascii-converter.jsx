"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parse as parseOpentypeFont } from "opentype.js";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const CHAR_SETS = {
  ascii: " .:-=+*#%@",
  symbols: " .·◦∘○◇△◻◎⁂◆★▩█",
  blocks: " ░▏▖▞▚▒▛▓█",
};

const EXPORT_FONT_SIZE = 16;
const EXPORT_CELL_WIDTH = EXPORT_FONT_SIZE * 0.6;
const EXPORT_CELL_HEIGHT = EXPORT_FONT_SIZE;

let monoFontPromise = null;
function loadMonoFont() {
  if (!monoFontPromise) {
    monoFontPromise = fetch("/fonts/GeistMono-Regular.ttf")
      .then((res) => res.arrayBuffer())
      .then((buffer) => parseOpentypeFont(buffer));
  }
  return monoFontPromise;
}

// Outlines each glyph once and reuses it via <use> per grid cell, so the
// SVG has no <text> nodes and renders identically without the font installed.
async function asciiToSvg(asciiText, cols) {
  const font = await loadMonoFont();
  const ascentPx = (font.ascender / font.unitsPerEm) * EXPORT_FONT_SIZE;
  const lines = asciiText.split("\n").filter((l) => l.length > 0);

  const pathIds = new Map();
  let defs = "";
  let uses = "";

  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === " ") continue;
      let id = pathIds.get(ch);
      if (id === undefined) {
        id = `c${pathIds.size}`;
        pathIds.set(ch, id);
        const glyphPath = font.getPath(ch, 0, ascentPx, EXPORT_FONT_SIZE);
        defs += `<path id="${id}" d="${glyphPath.toPathData(2)}"/>`;
      }
      const x = (col * EXPORT_CELL_WIDTH).toFixed(2);
      const y = (row * EXPORT_CELL_HEIGHT).toFixed(2);
      uses += `<use href="#${id}" x="${x}" y="${y}"/>`;
    }
  });

  const width = cols * EXPORT_CELL_WIDTH;
  const height = lines.length * EXPORT_CELL_HEIGHT;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="#ffffff"><defs>${defs}</defs>${uses}</svg>`;
}

function downloadSvg(svgMarkup, filename) {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function imageToAscii(
  img,
  cols,
  brightness = 0,
  invert = false,
  chars = CHAR_SETS.ascii,
  edge = 0,
) {
  const canvas = document.createElement("canvas");
  const ratio = img.naturalHeight / img.naturalWidth;
  const rows = Math.round(cols * ratio * 0.6);
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);

  const lums = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const p = i * 4;
    lums[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  const lum = (x, y) =>
    lums[
      Math.max(0, Math.min(rows - 1, y)) * cols +
        Math.max(0, Math.min(cols - 1, x))
    ];

  let result = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let val = lums[y * cols + x];

      if (edge > 0) {
        const gx =
          -lum(x - 1, y - 1) +
          lum(x + 1, y - 1) -
          2 * lum(x - 1, y) +
          2 * lum(x + 1, y) -
          lum(x - 1, y + 1) +
          lum(x + 1, y + 1);
        const gy =
          -lum(x - 1, y - 1) -
          2 * lum(x, y - 1) -
          lum(x + 1, y - 1) +
          lum(x - 1, y + 1) +
          2 * lum(x, y + 1) +
          lum(x + 1, y + 1);
        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        val = val * (1 - edge) + mag * edge;
      }

      let normalized = Math.max(0, Math.min(1, val / 255 + brightness));
      if (invert) normalized = 1 - normalized;
      result += chars[Math.floor(normalized * (chars.length - 1))];
    }
    result += "\n";
  }
  return result;
}

export default function AsciiConverter() {
  const [imageSrc, setImageSrc] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cols, setCols] = useState(100);
  const [brightness, setBrightness] = useState(0);
  const [edge, setEdge] = useState(0);
  const [invert, setInvert] = useState(false);
  const [ascii, setAscii] = useState("");
  const [typeOfChar, setTypeOfChar] = useState("ascii");
  const [fontSize, setFontSize] = useState(12);
  const [imgRatio, setImgRatio] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const imgRef = useRef(null);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    if (!outputRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      const fontByWidth = w / (cols * 0.6);
      const rows = imgRatio > 0 ? Math.round(cols * imgRatio * 0.6) : 0;
      const fontByHeight = rows > 0 ? h / rows : fontByWidth;
      setFontSize(Math.max(6, Math.floor(Math.min(fontByWidth, fontByHeight))));
    });
    observer.observe(outputRef.current);
    return () => observer.disconnect();
  }, [cols, imgRatio]);

  const convert = useCallback((img, w, b, inv, type, eg) => {
    setAscii(
      imageToAscii(
        img,
        w,
        b,
        inv,
        type === "ascii"
          ? CHAR_SETS.ascii
          : type === "blocks"
            ? CHAR_SETS.blocks
            : CHAR_SETS.symbols,
        eg,
      ),
    );
  }, []);

  const processFile = useCallback((file) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleExportSvg = useCallback(async () => {
    if (!ascii || isExporting) return;
    setIsExporting(true);
    try {
      const svgMarkup = await asciiToSvg(ascii, cols);
      downloadSvg(svgMarkup, "ascii-art.svg");
    } finally {
      setIsExporting(false);
    }
  }, [ascii, cols, isExporting]);

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    setImgRatio(imgRef.current.naturalHeight / imgRef.current.naturalWidth);
    convert(imgRef.current, cols, brightness, invert, typeOfChar, edge);
  }, [cols, brightness, invert, typeOfChar, edge, convert]);

  const handleColsChange = useCallback(
    (e) => {
      const val = 240 - Number(e.target.value);
      setCols(val);
      if (imgRef.current)
        convert(imgRef.current, val, brightness, invert, typeOfChar, edge);
    },
    [brightness, invert, typeOfChar, edge, convert],
  );

  const handleBrightnessChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      setBrightness(val);
      if (imgRef.current)
        convert(imgRef.current, cols, val, invert, typeOfChar, edge);
    },
    [cols, invert, typeOfChar, edge, convert],
  );

  const handleEdgeChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      setEdge(val);
      if (imgRef.current)
        convert(imgRef.current, cols, brightness, invert, typeOfChar, val);
    },
    [cols, brightness, invert, typeOfChar, convert],
  );

  const handleInvertChange = useCallback(
    (val) => {
      setInvert(val);
      if (imgRef.current)
        convert(imgRef.current, cols, brightness, val, typeOfChar, edge);
    },
    [cols, brightness, typeOfChar, edge, convert],
  );

  const handleCharSetToggle = useCallback(
    (val) => {
      console.log(val)
      setTypeOfChar(val);
      if (imgRef.current)
        convert(imgRef.current, cols, brightness, invert, val, edge);
    },
    [cols, brightness, invert, edge, convert],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      processFile(e.dataTransfer.files[0]);
    },
    [processFile],
  );

  const reset = () => {
    setImageSrc(null);
    setAscii("");
  };

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="flex flex-1 overflow-hidden"
    >
      {/* Left panel */}
      <ResizablePanel
        defaultSize="40%"
        className="w-1/2 flex flex-col gap-6 p-8 border-r border-border overflow-hidden bg-background"
      >
        <div>
          <h1 className="text-[1.6rem] font-bold tracking-tight text-primary">
            Image to ASCII
          </h1>
          <p className="text-foreground text-[1.4rem] mt-1">
            Upload an image and convert it to ASCII art
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`flex-1 min-h-0 rounded-4 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/20"
          }`}
        >
          {imageSrc ? (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="preview"
              onLoad={handleImageLoad}
              className="max-w-full max-h-full object-contain rounded-4 p-4"
            />
          ) : (
            <div className="text-center text-foreground select-none px-6">
              <svg
                className="mx-auto mb-3 opacity-40"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="font-medium">Click or drag an image here</p>
              <p className="text-[1.0rem] mt-1 opacity-60">
                PNG, JPG, WebP, GIF
              </p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => processFile(e.target.files?.[0])}
        />

        <div className="flex flex-col gap-4">
          {/* Change Character Size */}
          <div className="flex flex-col gap-2">
            <span className="text-[1.2rem] text-foreground">
              Character size
            </span>
            <input
              type="range"
              min={40}
              max={200}
              value={240 - cols}
              onChange={handleColsChange}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Change Brighness */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[1.2rem]">
              <span className="text-foreground">Brightness</span>
              <span className="font-mono font-medium">
                {brightness > 0 ? "+" : ""}
                {Math.round(brightness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={brightness}
              onChange={handleBrightnessChange}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Change Edge */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[1.2rem]">
              <span className="text-foreground">Edge detection</span>
              <span className="font-mono font-medium">
                {Math.round(edge * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={edge}
              onChange={handleEdgeChange}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Change Invert */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[1.2rem] text-foreground">Invert</span>
            <Switch checked={invert} onCheckedChange={handleInvertChange} />
          </label>

          <ButtonGroup>
            <Button
              variant={typeOfChar === "ascii" ? "" : "outline"}
              onClick={() => handleCharSetToggle("ascii")}
              className="flex-1 justify-center text-[1.4rem] py-20 hover:cursor-pointer"
            >
              ASCII
            </Button>
            <Button
              variant={typeOfChar === "symbols" ? "" : "outline"}
              onClick={() => handleCharSetToggle("symbols")}
              className="flex-1 justify-center text-[1.4rem] py-20 hover:cursor-pointer"
            >
              Symbols
            </Button>
            <Button
              variant={typeOfChar === "blocks" ? "" : "outline"}
              onClick={() => handleCharSetToggle("blocks")}
              className="flex-1 justify-center text-[1.4rem] py-20 hover:cursor-pointer"
            >
              Blocks
            </Button>
          </ButtonGroup>
        </div>

        {imageSrc && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={reset}
              className="flex-1 text-[1.4rem] py-20 hover:cursor-pointer"
            >
              Remove image
            </Button>
            <Button
              variant="outline"
              onClick={handleExportSvg}
              disabled={isExporting}
              className="flex-1 text-[1.4rem] py-20 hover:cursor-pointer"
            >
              {isExporting ? "Exporting..." : "Export SVG"}
            </Button>
          </div>
        )}
      </ResizablePanel>
      <ResizableHandle withHandle />
      {/* Right panel */}
      <ResizablePanel
        defaultSize="60%"
        elementRef={outputRef}
        className="w-1/2 bg-zinc-950 flex items-center justify-center overflow-hidden"
      >
        {ascii ? (
          (() => {
            const rows = Math.round(cols * imgRatio * 0.6);
            const blockW = Math.floor(cols * fontSize * 0.6);
            const blockH = rows * fontSize;
            return (
              <div
                style={{
                  width: blockW,
                  height: blockH,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <pre
                  className="text-white font-mono leading-none select-all"
                  style={{
                    position: "absolute",
                    inset: 0,
                    fontSize: `${fontSize}px`,
                    margin: 0,
                  }}
                >
                  {ascii}
                </pre>
              </div>
            );
          })()
        ) : (
          <p className="text-white/30 font-mono text-sm">
            // waiting for image...
          </p>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
