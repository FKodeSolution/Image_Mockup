import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Center, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

/* =========================================================
   1. 2D & 3D SHAPE PATH GENERATOR
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
      ctx.moveTo(cx, cy + hSize * 0.9);
      ctx.bezierCurveTo(cx - hSize * 1.5, cy + hSize * 0.2, cx - hSize * 1.2, cy - hSize * 1.1, cx, cy - hSize * 0.4);
      ctx.bezierCurveTo(cx + hSize * 1.2, cy - hSize * 1.1, cx + hSize * 1.5, cy + hSize * 0.2, cx, cy + hSize * 0.9);
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
      shape.moveTo(0, -1.2);
      shape.bezierCurveTo(-0.2, -0.9, -1.4, 0.0, -1.3, 0.7);
      shape.bezierCurveTo(-1.2, 1.3, -0.3, 1.3, 0, 0.6);
      shape.bezierCurveTo(0.3, 1.3, 1.2, 1.3, 1.3, 0.7);
      shape.bezierCurveTo(1.4, 0.0, 0.2, -0.9, 0, -1.2);
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
   2. THREE.JS 3D MESH VIEWER
========================================================= */
function MeshMagnet({ shapeType, canvasRef }) {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      const tex = new THREE.CanvasTexture(canvasRef.current);
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    }
  }, [canvasRef]);

  // Realtime canvas texture update
  useFrame(() => {
    if (texture) {
      texture.needsUpdate = true;
    }
  });

  const geometry = useMemo(() => {
    const shape = createCustom3DShape(shapeType);
    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();

    // Map UVs for Front Surface
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
      color: "#1e293b",
      roughness: 0.3,
      metalness: 0.4,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.2,
      metalness: 0.05,
    });

    return [sideMat, frontMat];
  }, [texture]);

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry} material={materials} castShadow receiveShadow />
    </Center>
  );
}

/* =========================================================
   3. MAIN FRIDGE MAGNET EDITOR & 2D CANVAS ALIGNMENT
========================================================= */
export default function MagnetCustomizerApp() {
  const [shape, setShape] = useState("heart");
  const [imageObj, setImageObj] = useState(null);

  // Transform States
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Offscreen Texture Canvas (1024x1024)
  const textureCanvasRef = useRef(document.createElement("canvas"));
  // Visible 2D Editor Canvas
  const editorCanvasRef = useRef(null);

  // Image Upload Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setImageObj(img);
        setTransform({ x: 0, y: 0, scale: 1, rotate: 0 });
      };
    }
  };

  // Draw Function for 2D Canvas & 3D Texture
  useEffect(() => {
    // 1. Draw 3D Texture Canvas (Full Resolution)
    const texCanvas = textureCanvasRef.current;
    texCanvas.width = 1024;
    texCanvas.height = 1024;
    const tCtx = texCanvas.getContext("2d");

    tCtx.fillStyle = "#ffffff";
    tCtx.fillRect(0, 0, 1024, 1024);

    if (imageObj) {
      tCtx.save();
      tCtx.translate(512 + transform.x * 2, 512 + transform.y * 2);
      tCtx.rotate((transform.rotate * Math.PI) / 180);
      tCtx.scale(transform.scale, transform.scale);
      tCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
      tCtx.restore();
    }

    // 2. Draw Interactive 2D Editor Canvas
    const editorCanvas = editorCanvasRef.current;
    if (!editorCanvas) return;
    const eCtx = editorCanvas.getContext("2d");
    const w = editorCanvas.width;
    const h = editorCanvas.height;

    eCtx.clearRect(0, 0, w, h);

    // Draw Image Inside Selected Shape Overlay
    if (imageObj) {
      eCtx.save();
      // Clip image inside the shape cutout
      drawShapePath(eCtx, shape, w, h);
      eCtx.clip();

      eCtx.translate(w / 2 + transform.x, h / 2 + transform.y);
      eCtx.rotate((transform.rotate * Math.PI) / 180);

      // Fit scale proportionally to editor view
      const baseScale = (w * 0.75) / Math.max(imageObj.width, imageObj.height);
      const totalScale = baseScale * transform.scale;

      eCtx.scale(totalScale, totalScale);
      eCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
      eCtx.restore();
    }

    // Draw Shape Outer Border Guide Line
    eCtx.save();
    drawShapePath(eCtx, shape, w, h);
    eCtx.lineWidth = 3;
    eCtx.strokeStyle = "#6366f1"; // Indigo border outline
    eCtx.setLineDash([6, 6]);
    eCtx.stroke();
    eCtx.restore();
  }, [imageObj, transform, shape]);

  // Drag Controls for 2D Alignment Canvas
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-white p-6 gap-6">
      {/* LEFT PANEL: 2D Interactive Alignment Studio */}
      <div className="w-full lg:w-96 bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold mb-1">Custom Magnet Editor 🧲</h2>
          <p className="text-xs text-slate-400">
            போட்டோவை Upload செய்து Cursor மூலம் நகர்த்தி Shape-க்கு ஏத்த மாதிரி Set செய்யுங்கள்.
          </p>
        </div>

        {/* 1. Upload Button */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">1. Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer bg-slate-950 p-2 rounded-xl border border-slate-800"
          />
        </div>

        {/* 2. Shape Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">2. Select Shape</label>
          <div className="grid grid-cols-4 gap-2">
            {["circle", "square", "heart", "star"].map((s) => (
              <button
                key={s}
                onClick={() => setShape(s)}
                className={`py-2 text-xs capitalize font-medium rounded-xl border transition-all ${
                  shape === s
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 2D Interactive Alignment Canvas View */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
            3. Drag to Fit Image inside Shape
          </label>
          <div className="relative w-full aspect-square bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
            <canvas
              ref={editorCanvasRef}
              width={340}
              height={340}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-grab active:cursor-grabbing touch-none"
            />
            {!imageObj && (
              <span className="absolute text-xs text-slate-500 pointer-events-none">
                📁 Upload an image to start alignment
              </span>
            )}
          </div>
        </div>

        {/* 4. Fine Tune Controls (Zoom & Rotation) */}
        {imageObj && (
          <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Zoom Scale</span>
                <span>{transform.scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={transform.scale}
                onChange={(e) => setTransform({ ...transform, scale: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Rotate</span>
                <span>{transform.rotate}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={transform.rotate}
                onChange={(e) => setTransform({ ...transform, rotate: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Live 3D Magnet Output Preview */}
      <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative min-h-[500px]">
        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs text-slate-300 border border-white/10 shadow-lg">
          ✨ Live 3D Fridge Magnet View
        </div>

        <Canvas camera={{ position: [0, 0, 4.2], fov: 45 }}>
          <ambientLight intensity={1.1} />
          <directionalLight position={[10, 10, 10]} intensity={1.3} castShadow />
          <Environment preset="city" />

          <MeshMagnet shapeType={shape} canvasRef={textureCanvasRef} />

          <ContactShadows position={[0, -1.6, 0]} opacity={0.5} scale={6} blur={1.5} />
          <OrbitControls enablePan={true} enableZoom={true} />
        </Canvas>
      </div>
    </div>
  );
}