import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import InfoModal from '@/components/InfoModal';
import { Info } from 'lucide-react';
import * as Effects from '@/lib/effects';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface Point {
  x: number;
  y: number;
}

interface Hand {
  landmarks: Point[];
  handedness: string;
}

interface PanelGeometry {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

const EFFECT_MODES = [
  { id: 'xray', label: 'X-RAY', color: '#00ffcc', sliderLabel: 'Edge' },
  { id: 'thermal', label: 'THERMAL', color: '#ff6600', sliderLabel: 'Heat' },
  { id: 'matrix', label: 'MATRIX', color: '#00ff41', sliderLabel: 'Density' },
  { id: 'neon', label: 'NEON', color: '#ff00ff', sliderLabel: 'Glow' },
  { id: 'particle', label: 'PARTICLE', color: '#ff3366', sliderLabel: 'Size' },
  { id: 'mosaic', label: 'MOSAIC', color: '#ffaa00', sliderLabel: 'Block' },
  { id: 'optflow', label: 'OPT FLOW', color: '#00ccff', sliderLabel: 'Sensitivity' },
  { id: 'timeslice', label: 'TIME SLICE', color: '#cc66ff', sliderLabel: 'Depth' },
  { id: 'ascii', label: 'ASCII', color: '#88ff88', sliderLabel: 'Size' },
  { id: 'asciiov', label: 'ASCII OV', color: '#ffffaa', sliderLabel: 'Size' },
  { id: 'tracking', label: 'TRACKING', color: '#ffffff', sliderLabel: 'Threshold' },
  { id: 'flower', label: 'FLOWER', color: '#ff8866', sliderLabel: 'Size' },
  { id: 'glass', label: 'GLASS', color: '#aaddff', sliderLabel: 'Refract' },
];

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// ============================================================================
// HOME COMPONENT
// ============================================================================

export default function Home() {
  const [isReady, setIsReady] = useState(false);
  const [effectModeIndex, setEffectModeIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [flashText, setFlashText] = useState('');
  const [flashOpacity, setFlashOpacity] = useState(0);

  // Refs for mutable state (no re-renders)
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);

  const panelRef = useRef<PanelGeometry>({
    topLeft: { x: 0.2, y: 0.2 },
    topRight: { x: 0.8, y: 0.2 },
    bottomLeft: { x: 0.2, y: 0.8 },
    bottomRight: { x: 0.8, y: 0.8 },
  });

  const smoothedPanelRef = useRef<PanelGeometry>({
    topLeft: { x: 0.2, y: 0.2 },
    topRight: { x: 0.8, y: 0.2 },
    bottomLeft: { x: 0.2, y: 0.8 },
    bottomRight: { x: 0.8, y: 0.8 },
  });

  const handsRef = useRef<Hand[]>([]);
  const pinchCooldownRef = useRef(0);
  const lastPinchStateRef = useRef({ left: false, right: false });
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const timeSliceBufferRef = useRef<Uint8ClampedArray[]>([]);

  // Initialize MediaPipe and webcam
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        handLandmarkerRef.current = handLandmarker;

        // Request camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsReady(true);
            startRenderLoop();
          };
        }
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    };

    initializeApp();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const lerpPoint = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  const lerpPanel = (a: PanelGeometry, b: PanelGeometry, t: number): PanelGeometry => ({
    topLeft: lerpPoint(a.topLeft, b.topLeft, t),
    topRight: lerpPoint(a.topRight, b.topRight, t),
    bottomLeft: lerpPoint(a.bottomLeft, b.bottomLeft, t),
    bottomRight: lerpPoint(a.bottomRight, b.bottomRight, t),
  });

  const processHandLandmarks = (results: any) => {
    const hands: Hand[] = [];

    if (results.landmarks) {
      for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i].map((lm: any) => ({
          x: lm.x,
          y: lm.y,
        }));

        hands.push({
          landmarks,
          handedness: results.handedness?.[i]?.displayName || 'Unknown',
        });
      }
    }

    handsRef.current = hands;
    setHandCount(hands.length);

    // Compute panel geometry
    if (hands.length === 2) {
      const avgXLeft = hands[0].landmarks.reduce((sum, lm) => sum + lm.x, 0) / 21;
      const avgXRight = hands[1].landmarks.reduce((sum, lm) => sum + lm.x, 0) / 21;

      const leftHand = avgXLeft > avgXRight ? hands[0] : hands[1];
      const rightHand = avgXLeft > avgXRight ? hands[1] : hands[0];

      const leftIndex = leftHand.landmarks[8];
      const leftThumb = leftHand.landmarks[4];
      const rightIndex = rightHand.landmarks[8];
      const rightThumb = rightHand.landmarks[4];

      // Check for pinch
      const leftPinchDist = Math.sqrt(
        Math.pow(leftIndex.x - leftThumb.x, 2) + Math.pow(leftIndex.y - leftThumb.y, 2)
      );
      const rightPinchDist = Math.sqrt(
        Math.pow(rightIndex.x - rightThumb.x, 2) + Math.pow(rightIndex.y - rightThumb.y, 2)
      );

      const leftPinching = leftPinchDist < 0.1;
      const rightPinching = rightPinchDist < 0.1;

      if (leftPinching && rightPinching) {
        // Both pinching: horizontal strip
        const leftCenter = {
          x: (leftThumb.x + leftIndex.x) / 2,
          y: (leftThumb.y + leftIndex.y) / 2,
        };
        const rightCenter = {
          x: (rightThumb.x + rightIndex.x) / 2,
          y: (rightThumb.y + rightIndex.y) / 2,
        };

        const stripHeight = 0.15;
        panelRef.current = {
          topLeft: { x: leftCenter.x, y: leftCenter.y - stripHeight / 2 },
          topRight: { x: rightCenter.x, y: rightCenter.y - stripHeight / 2 },
          bottomLeft: { x: leftCenter.x, y: leftCenter.y + stripHeight / 2 },
          bottomRight: { x: rightCenter.x, y: rightCenter.y + stripHeight / 2 },
        };
      } else {
        // Open panel
        const topY = Math.min(leftIndex.y, leftThumb.y, rightIndex.y, rightThumb.y);
        const botY = Math.max(leftIndex.y, leftThumb.y, rightIndex.y, rightThumb.y);

        panelRef.current = {
          topLeft: { x: leftIndex.x, y: topY },
          topRight: { x: rightIndex.x, y: topY },
          bottomLeft: { x: leftIndex.x, y: botY },
          bottomRight: { x: rightIndex.x, y: botY },
        };
      }

      // Handle pinch gesture for effect cycling
      const wasPinching = lastPinchStateRef.current.left || lastPinchStateRef.current.right;
      const isPinchingNow = leftPinching || rightPinching;

      if (isPinchingNow && !wasPinching && pinchCooldownRef.current <= 0) {
        const nextIdx = (effectModeIndex + 1) % EFFECT_MODES.length;
        setEffectModeIndex(nextIdx);
        setSliderValue(0.5);
        setFlashText(EFFECT_MODES[nextIdx].label);
        setFlashOpacity(1);
        setTimeout(() => setFlashOpacity(0), 500);
        pinchCooldownRef.current = 1.5;
      }

      lastPinchStateRef.current = { left: leftPinching, right: rightPinching };
    }
  };

  const drawMirroredBackground = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number
  ) => {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
  };

  const applyEffect = (
    fxCtx: CanvasRenderingContext2D,
    bgCanvas: HTMLCanvasElement,
    panel: PanelGeometry,
    effectId: string,
    paramValue: number,
    width: number,
    height: number
  ) => {
    const { topLeft, topRight, bottomLeft, bottomRight } = panel;

    // Determine max resolution based on effect
    const detailSensitiveEffects = ['ascii', 'asciiov', 'flower'];
    const maxRes = detailSensitiveEffects.includes(effectId) ? 800 : 300;

    // Compute bounding box
    const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

    const regionWidth = (maxX - minX) * width;
    const regionHeight = (maxY - minY) * height;
    const scale = Math.min(1, maxRes / Math.max(regionWidth, regionHeight));

    const scaledWidth = Math.ceil(regionWidth * scale);
    const scaledHeight = Math.ceil(regionHeight * scale);

    if (scaledWidth <= 0 || scaledHeight <= 0) return;

    // Draw panel region to offscreen canvas
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = scaledWidth;
    offscreenCanvas.height = scaledHeight;
    const offCtx = offscreenCanvas.getContext('2d')!;

    const srcX = minX * width;
    const srcY = minY * height;

    offCtx.drawImage(
      bgCanvas,
      srcX,
      srcY,
      regionWidth,
      regionHeight,
      0,
      0,
      scaledWidth,
      scaledHeight
    );

    let imageData = offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
    const data = imageData.data;

    // Apply effect
    switch (effectId) {
      case 'xray':
        Effects.applyXRayEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
      case 'thermal':
        Effects.applyThermalEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
      case 'matrix':
        Effects.applyMatrixEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
      case 'neon':
        Effects.applyNeonEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
      case 'particle':
        Effects.applyParticleEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
      case 'mosaic':
        Effects.applyMosaicEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
      case 'optflow':
        prevFrameDataRef.current = Effects.applyOptFlowEffect(
          data,
          scaledWidth,
          scaledHeight,
          paramValue,
          prevFrameDataRef.current
        );
        break;
      case 'timeslice':
        timeSliceBufferRef.current.push(new Uint8ClampedArray(data));
        if (timeSliceBufferRef.current.length > 20) {
          timeSliceBufferRef.current.shift();
        }
        Effects.applyTimeSliceEffect(data, scaledWidth, scaledHeight, paramValue, timeSliceBufferRef.current);
        break;
      case 'ascii':
        Effects.renderASCIIEffect(offCtx, data, scaledWidth, scaledHeight, paramValue);
        offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        break;
      case 'asciiov':
        Effects.renderASCIIOVEffect(offCtx, data, scaledWidth, scaledHeight, paramValue);
        offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        break;
      case 'tracking':
        Effects.renderTrackingEffect(offCtx, data, scaledWidth, scaledHeight, paramValue);
        offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        break;
      case 'flower':
        Effects.renderFlowerEffect(offCtx, data, scaledWidth, scaledHeight, paramValue);
        offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        break;
      case 'glass':
        Effects.applyGlassEffect(data, scaledWidth, scaledHeight, paramValue);
        break;
    }

    offCtx.putImageData(imageData, 0, 0);

    // Clip to panel shape and draw
    fxCtx.save();
    fxCtx.beginPath();
    fxCtx.moveTo(topLeft.x * width, topLeft.y * height);
    fxCtx.lineTo(topRight.x * width, topRight.y * height);
    fxCtx.lineTo(bottomRight.x * width, bottomRight.y * height);
    fxCtx.lineTo(bottomLeft.x * width, bottomLeft.y * height);
    fxCtx.closePath();
    fxCtx.clip();

    fxCtx.drawImage(offscreenCanvas, srcX, srcY, regionWidth, regionHeight, srcX, srcY, regionWidth, regionHeight);
    fxCtx.restore();
  };

  const drawHandSkeletons = (
    ctx: CanvasRenderingContext2D,
    hands: Hand[],
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.6)';
    ctx.lineWidth = 2;

    hands.forEach((hand) => {
      // Draw connections
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = hand.landmarks[start];
        const p2 = hand.landmarks[end];
        const x1 = (1 - p1.x) * width;
        const y1 = p1.y * height;
        const x2 = (1 - p2.x) * width;
        const y2 = p2.y * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw joints
      hand.landmarks.forEach((landmark, idx) => {
        const x = (1 - landmark.x) * width;
        const y = landmark.y * height;

        if ([4, 8, 12, 16, 20].includes(idx)) {
          // Fingertips
          ctx.fillStyle = EFFECT_MODES[effectModeIndex].color;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Other joints
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  };

  const drawPanelBorder = (
    ctx: CanvasRenderingContext2D,
    panel: PanelGeometry,
    width: number,
    height: number,
    effectColor: string
  ) => {
    const { topLeft, topRight, bottomLeft, bottomRight } = panel;

    const p1 = { x: topLeft.x * width, y: topLeft.y * height };
    const p2 = { x: topRight.x * width, y: topRight.y * height };
    const p3 = { x: bottomRight.x * width, y: bottomRight.y * height };
    const p4 = { x: bottomLeft.x * width, y: bottomLeft.y * height };

    // Outer glow
    ctx.shadowColor = effectColor;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = effectColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.stroke();

    // Inner border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = effectColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.stroke();

    // Corner markers
    const cornerLength = 12;
    const corners = [p1, p2, p3, p4];
    corners.forEach((corner, idx) => {
      ctx.strokeStyle = effectColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (idx === 0) {
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x + cornerLength, corner.y);
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y + cornerLength);
      } else if (idx === 1) {
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x - cornerLength, corner.y);
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y + cornerLength);
      } else if (idx === 2) {
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x - cornerLength, corner.y);
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y - cornerLength);
      } else {
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x + cornerLength, corner.y);
        ctx.moveTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y - cornerLength);
      }
      ctx.stroke();
    });
  };

  const startRenderLoop = () => {
    const render = () => {
      if (!videoRef.current || !bgCanvasRef.current || !fxCanvasRef.current || !overlayCanvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const video = videoRef.current;
      const bgCanvas = bgCanvasRef.current;
      const fxCanvas = fxCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      // Guard checks
      if (video.readyState < video.HAVE_ENOUGH_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      // Sync canvas sizes
      bgCanvas.width = width;
      bgCanvas.height = height;
      fxCanvas.width = width;
      fxCanvas.height = height;
      overlayCanvas.width = width;
      overlayCanvas.height = height;

      const bgCtx = bgCanvas.getContext('2d')!;
      const fxCtx = fxCanvas.getContext('2d')!;
      const overlayCtx = overlayCanvas.getContext('2d')!;

      // Draw mirrored background
      drawMirroredBackground(bgCtx, video, width, height);

      // Clear effect and overlay canvases
      fxCtx.clearRect(0, 0, width, height);
      overlayCtx.clearRect(0, 0, width, height);

      // Run hand detection
      if (video.currentTime !== lastVideoTimeRef.current && handLandmarkerRef.current) {
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
          lastVideoTimeRef.current = video.currentTime;
          processHandLandmarks(results);
        } catch (error) {
          console.error('Detection error:', error);
        }
      }

      // Update cooldown
      if (pinchCooldownRef.current > 0) {
        pinchCooldownRef.current -= 0.016; // ~60fps
      }

      // Apply smoothing to panel
      smoothedPanelRef.current = lerpPanel(smoothedPanelRef.current, panelRef.current, 0.3);

      // Apply effect if two hands are visible
      if (handsRef.current.length === 2) {
        applyEffect(
          fxCtx,
          bgCanvas,
          smoothedPanelRef.current,
          EFFECT_MODES[effectModeIndex].id,
          sliderValue,
          width,
          height
        );
      }

      // Draw hand skeletons
      drawHandSkeletons(overlayCtx, handsRef.current, width, height);

      // Draw panel border if two hands visible
      if (handsRef.current.length === 2) {
        drawPanelBorder(overlayCtx, smoothedPanelRef.current, width, height, EFFECT_MODES[effectModeIndex].color);

        // Draw mode label
        overlayCtx.fillStyle = EFFECT_MODES[effectModeIndex].color;
        overlayCtx.font = '14px JetBrains Mono';
        overlayCtx.textAlign = 'center';
        const labelY =
          (smoothedPanelRef.current.bottomLeft.y + smoothedPanelRef.current.bottomRight.y) / 2 * height + 20;
        overlayCtx.fillText(EFFECT_MODES[effectModeIndex].label, width / 2, labelY);
      }

      // Draw hand count
      overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      overlayCtx.font = '12px JetBrains Mono';
      overlayCtx.textAlign = 'left';
      overlayCtx.fillText(`Hands: ${handCount}`, 10, 20);

      // Draw flash notification
      if (flashOpacity > 0) {
        overlayCtx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        overlayCtx.font = 'bold 24px JetBrains Mono';
        overlayCtx.textAlign = 'center';
        overlayCtx.fillText(flashText, width / 2, height / 2);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  };

  const handleEffectDotClick = (index: number) => {
    setEffectModeIndex(index);
    setSliderValue(0.5);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-0 h-0 opacity-0"
      />

      {/* Canvas stack */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Loading screen */}
      {!isReady && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="text-white text-center">
            <p className="text-lg mb-4">Loading AI Models & Camera...</p>
            <div className="w-48 h-2 bg-gray-800 rounded">
              <div className="h-full bg-cyan-500 rounded animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom-left controls */}
      {isReady && (
        <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-4">
          {/* Effect dots */}
          <div className="flex gap-2">
            {EFFECT_MODES.map((mode, idx) => (
              <button
                key={idx}
                onClick={() => handleEffectDotClick(idx)}
                className="rounded-full transition-all hover:scale-110"
                style={{
                  width: idx === effectModeIndex ? 16 : 12,
                  height: idx === effectModeIndex ? 16 : 12,
                  backgroundColor: idx === effectModeIndex ? mode.color : 'rgba(255, 255, 255, 0.3)',
                  boxShadow: idx === effectModeIndex ? `0 0 10px ${mode.color}` : 'none',
                }}
              />
            ))}
          </div>

          {/* Parameter slider */}
          <div className="bg-black bg-opacity-70 px-4 py-3 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">
              {EFFECT_MODES[effectModeIndex].sliderLabel}: {Math.round(sliderValue * 100)}%
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderValue}
              onChange={(e) => setSliderValue(parseFloat(e.target.value))}
              className="w-32 h-1 rounded appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${EFFECT_MODES[effectModeIndex].color}40, ${EFFECT_MODES[effectModeIndex].color})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom-right info button */}
      {isReady && (
        <button
          onClick={() => setShowInfoModal(true)}
          className="absolute bottom-6 right-6 z-10 w-12 h-12 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-all flex items-center justify-center border border-gray-600"
        >
          <Info size={20} className="text-white" />
        </button>
      )}

      {/* Info modal */}
      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
    </div>
  );
}
