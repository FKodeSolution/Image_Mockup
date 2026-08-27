import React, { useState, useEffect, useRef } from "react";
import { Upload, RotateCcw, ZoomIn, Move, RotateCw } from "lucide-react";

export default function ImageUploader({ setImage }) {
  const [rawImage, setRawImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setRawImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Render & export adjusted canvas image texture
  useEffect(() => {
    if (!rawImage) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.src = rawImage;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2 + posX * 500, canvas.height / 2 - posY * 500);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const scale = Math.max(1024 / img.width, 1024 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;

      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      setImage(canvas.toDataURL("image/png"));
    };
  }, [rawImage, zoom, posX, posY, rotation, setImage]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStartRef.current.x) / 300;
    const dy = (e.clientY - dragStartRef.current.y) / 300;

    setPosX((prev) => Math.max(-1.5, Math.min(1.5, prev + dx)));
    setPosY((prev) => Math.max(-1.5, Math.min(1.5, prev - dy)));

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setRotation(0);
  };

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 p-5 transition-all hover:border-indigo-500 hover:bg-slate-800">
        <Upload className="h-6 w-6 text-slate-400 mb-2" />
        <span className="text-xs font-bold text-slate-200">Upload Front Graphic</span>
        <span className="text-[11px] text-slate-400 mt-0.5">PNG or JPG up to 10MB</span>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>

      {rawImage && (
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/80 p-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="text-xs font-bold text-slate-300">Image Alignment Pad</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-400"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          {/* Interactive Dragging Pad */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative h-36 w-full rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden select-none"
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <Move className="h-10 w-10 text-indigo-400" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 z-10 pointer-events-none">
              🖐️ Drag cursor here to adjust image position
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                <span className="flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5"/> Scale Zoom</span>
                <span className="font-mono text-[11px] text-indigo-400">{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range" min="0.3" max="3" step="0.02" value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                <span className="flex items-center gap-1"><RotateCw className="h-3.5 w-3.5"/> Rotate Angle</span>
                <span className="font-mono text-[11px] text-indigo-400">{rotation}°</span>
              </div>
              <input
                type="range" min="0" max="360" step="1" value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}