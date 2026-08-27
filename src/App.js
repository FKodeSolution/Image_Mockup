import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Center, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/* =========================================================
   1. 2D & 3D SHAPE PATH GENERATORS
========================================================= */
function drawShapePath(ctx, shapeType, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height) * 0.38;

  ctx.beginPath();
  switch (shapeType) {
    case "circle":
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      break;
    case "square":
      ctx.rect(cx - size, cy - size, size * 2, size * 2);
      break;
    case "heart": {
      const hSize = size * 0.8;
      ctx.moveTo(cx, cy + hSize * 0.7);
      ctx.bezierCurveTo(cx - hSize * 1.4, cy + hSize * 0.1, cx - hSize * 1.2, cy - hSize * 1.1, cx, cy - hSize * 0.4);
      ctx.bezierCurveTo(cx + hSize * 1.2, cy - hSize * 1.1, cx + hSize * 1.4, cy + hSize * 0.1, cx, cy + hSize * 0.7);
      break;
    }
    case "star": {
      const pts = 5;
      const outerR = size;
      const innerR = size * 0.45;
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      break;
    }
    default:
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
  }
  ctx.closePath();
}

function createCustom3DShape(shapeType) {
  const shape = new THREE.Shape();
  switch (shapeType) {
    case "circle":
      shape.absarc(0, 0, 1.4, 0, Math.PI * 2, false);
      break;
    case "square":
      shape.moveTo(-1.25, -1.25);
      shape.lineTo(1.25, -1.25);
      shape.lineTo(1.25, 1.25);
      shape.lineTo(-1.25, 1.25);
      break;
    case "heart":
      shape.moveTo(0, -1.0);
      shape.bezierCurveTo(-0.2, -0.7, -1.4, 0.1, -1.3, 0.7);
      shape.bezierCurveTo(-1.2, 1.3, -0.3, 1.3, 0, 0.6);
      shape.bezierCurveTo(0.3, 1.3, 1.2, 1.3, 1.3, 0.7);
      shape.bezierCurveTo(1.4, 0.1, 0.2, -0.7, 0, -1.0);
      break;
    case "star": {
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? 1.4 : 0.6;
        const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      break;
    }
    default:
      shape.absarc(0, 0, 1.4, 0, Math.PI * 2, false);
  }
  shape.closePath();
  return shape;
}

/* =========================================================
   2. 3D MESH VIEWER
========================================================= */
function MeshMagnet({ shapeType, canvasRef, meshRef }) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      const tex = new THREE.CanvasTexture(canvasRef.current);
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    }
  }, [canvasRef]);

  useFrame(() => {
    if (texture) texture.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const shape = createCustom3DShape(shapeType);
    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();

    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;
    const uvAttribute = geo.attributes.uv;
    const posAttribute = geo.attributes.position;

    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      const u = (x - min.x) / (max.x - min.x);
      const v = (y - min.y) / (max.y - min.y);
      uvAttribute.setXY(i, u, v);
    }
    uvAttribute.needsUpdate = true;
    return geo;
  }, [shapeType]);

  const materials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color: "#0f172a",
      roughness: 0.3,
      metalness: 0.8,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.15,
      metalness: 0.05,
    });

    return [frontMat, sideMat];
  }, [texture]);

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry} material={materials} castShadow receiveShadow />
    </Center>
  );
}

/* =========================================================
   3. MAIN APPLICATION WITH DYNAMIC QUANTITY & PRICE
========================================================= */
export default function MagnetCustomizerApp() {
  const [shape, setShape] = useState("heart");
  const [imageObj, setImageObj] = useState(null);
  const [quantity, setQuantity] = useState(1); // Quantity State

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const textureCanvasRef = useRef(document.createElement("canvas"));
  const editorCanvasRef = useRef(null);
  const meshRef = useRef(null);

  // Dynamic Price Engine per unit
  const shapePrices = { circle: 249, square: 249, heart: 299, star: 349 };
  const unitPrice = shapePrices[shape] || 249;
  const totalPrice = unitPrice * quantity; // Total Calculation

  // 3D Download Handler
  const handleDownload3D = () => {
    if (!meshRef.current) return;

    const exporter = new GLTFExporter();
    exporter.parse(
      meshRef.current,
      (gltf) => {
        const output = JSON.stringify(gltf, null, 2);
        const blob = new Blob([output], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `3d-magnet-${shape}.gltf`;
        link.click();
      },
      (error) => console.error("3D Export error:", error),
      { binary: false }
    );
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setImageObj(img);
        setTransform({ x: 0, y: 0, scale: 1, rotate: 0 });
      };
    }
  };

  useEffect(() => {
    const editorCanvas = editorCanvasRef.current;
    if (!editorCanvas) return;

    const editorWidth = editorCanvas.width;
    const editorHeight = editorCanvas.height;
    const texWidth = 1024;
    const texHeight = 1024;
    const scaleFactor = texWidth / editorWidth;

    const texCanvas = textureCanvasRef.current;
    texCanvas.width = texWidth;
    texCanvas.height = texHeight;
    const tCtx = texCanvas.getContext("2d");

    tCtx.fillStyle = "#ffffff";
    tCtx.fillRect(0, 0, texWidth, texHeight);

    if (imageObj) {
      tCtx.save();
      const baseScale = (texWidth * 0.75) / Math.max(imageObj.width, imageObj.height);
      const totalScale = baseScale * transform.scale;

      tCtx.translate(texWidth / 2 + transform.x * scaleFactor, texHeight / 2 + transform.y * scaleFactor);
      tCtx.rotate((transform.rotate * Math.PI) / 180);
      tCtx.scale(totalScale, totalScale);
      tCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
      tCtx.restore();
    }

    const eCtx = editorCanvas.getContext("2d");
    eCtx.clearRect(0, 0, editorWidth, editorHeight);

    if (imageObj) {
      eCtx.save();
      drawShapePath(eCtx, shape, editorWidth, editorHeight);
      eCtx.clip();

      const baseScale = (editorWidth * 0.75) / Math.max(imageObj.width, imageObj.height);
      const totalScale = baseScale * transform.scale;

      eCtx.translate(editorWidth / 2 + transform.x, editorHeight / 2 + transform.y);
      eCtx.rotate((transform.rotate * Math.PI) / 180);
      eCtx.scale(totalScale, totalScale);
      eCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
      eCtx.restore();
    }

    eCtx.save();
    drawShapePath(eCtx, shape, editorWidth, editorHeight);
    eCtx.lineWidth = 3;
    eCtx.strokeStyle = "#818cf8";
    eCtx.setLineDash([8, 6]);
    eCtx.stroke();
    eCtx.restore();
  }, [imageObj, transform, shape]);

  const handleMouseDown = (e) => {
    if (!imageObj) return;
    isDragging.current = true;
    startPos.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
    }));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 flex flex-col font-sans">
      {/* HEADER BAR */}
      <header className="w-full border-b border-indigo-900/40 bg-[#090d20]/80 backdrop-blur-md px-8 py-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
         
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
          NG INOVATION DEMO
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* PRICE DISPLAY */}
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">
              Total ({quantity} Pcs)
            </p>
            <p className="text-xl font-black text-white">
              ₹{totalPrice} <span className="text-xs text-slate-400 font-normal">(₹{unitPrice}/pc)</span>
            </p>
          </div>

          <button
            onClick={handleDownload3D}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-indigo-500/30 hover:bg-slate-700 text-cyan-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95"
          >
            <span>📥</span> Download 3D
          </button>

          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
            Order Now
          </button>
        </div>
      </header>

      {/* CENTERED WORKSPACE GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT PANEL: 2D ALIGNMENT EDITOR & QUANTITY SELECTOR */}
        <div className="lg:col-span-4 bg-[#090d20]/90 p-6 rounded-3xl border border-indigo-900/50 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold tracking-wider uppercase text-indigo-400">Step 1: Alignment Studio</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">2D Canvas</span>
          </div>

          <div className="relative aspect-square w-full bg-[#02040a] rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner group">
            <canvas
              ref={editorCanvasRef}
              width={320}
              height={320}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-grab active:cursor-grabbing touch-none z-10"
            />
            {!imageObj && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none gap-2">
                <span className="text-2xl">📸</span>
                <span className="text-xs">Upload photo below to start</span>
              </div>
            )}
          </div>

          {/* QUANTITY SELECTOR SECTION */}
          <div className="bg-[#030611] p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Select Quantity (எண்ணிக்கை)</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-700 bg-slate-900 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-all"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center bg-transparent text-sm font-bold text-white outline-none"
                />
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-all"
                >
                  +
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      quantity === q
                        ? "bg-indigo-600 border-indigo-400 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {q}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {imageObj && (
            <div className="space-y-3 bg-[#030611] p-4 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>ZOOM</span>
                  <span className="text-cyan-400">{transform.scale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="3"
                  step="0.05"
                  value={transform.scale}
                  onChange={(e) => setTransform({ ...transform, scale: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>ROTATE</span>
                  <span className="text-indigo-400">{transform.rotate}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={transform.rotate}
                  onChange={(e) => setTransform({ ...transform, rotate: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Upload Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer bg-[#030611] p-2 rounded-xl border border-slate-800"
            />
          </div>
        </div>

        {/* RIGHT PANEL: 3D VIEWPORT */}
        <div className="lg:col-span-8 h-[540px] bg-[#090d20]/90 rounded-3xl border border-indigo-900/50 shadow-2xl relative overflow-hidden flex flex-col">
          
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs text-indigo-300 border border-indigo-500/20 shadow-lg pointer-events-auto">
              ✨ Realtime 3D View
            </span>

            <div className="flex gap-2 bg-black/70 backdrop-blur-md p-1.5 rounded-2xl border border-indigo-500/20 pointer-events-auto">
              {["circle", "square", "heart", "star"].map((s) => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  className={`px-3 py-1.5 text-xs capitalize font-bold rounded-xl transition-all ${
                    shape === s
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-full">
            <Canvas camera={{ position: [0, 0, 4.2], fov: 45 }}>
              <ambientLight intensity={1.5} />
              <directionalLight position={[10, 10, 10]} intensity={2.0} castShadow />
              <Environment preset="city" />

              <MeshMagnet shapeType={shape} canvasRef={textureCanvasRef} meshRef={meshRef} />

              <ContactShadows position={[0, -1.6, 0]} opacity={0.7} scale={6} blur={1.5} />
              <OrbitControls enablePan={true} enableZoom={true} minDistance={2.5} maxDistance={6} />
            </Canvas>
          </div>

          <div className="h-14 border-t border-indigo-900/30 bg-[#040714]/80 px-6 flex justify-between items-center text-xs text-slate-400">
            <div className="flex gap-4">
              <span>Finish: <strong className="text-white">Glossy Acrylic</strong></span>
              <span>Selected Pcs: <strong className="text-cyan-400">{quantity} Pcs</strong></span>
            </div>
            <div className="text-indigo-400 font-mono text-[10px]">
              RENDER: OK ⚡ 60FPS
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
