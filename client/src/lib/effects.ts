/**
 * Visual Effects Library for X-Ray Hand Tracker
 * All effects use Canvas 2D pixel manipulation (no WebGL)
 */

// ============================================================================
// EFFECT: X-RAY
// ============================================================================
export function applyXRayEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const edgeStrength = 1.5 + param * 3.5;
  const scanlineIntensity = 0.3;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    // Invert brightness
    const inverted = 255 - brightness;

    // Apply edge enhancement
    let edgeValue = inverted * edgeStrength;
    edgeValue = Math.min(255, edgeValue);

    // Apply scanline effect
    const pixelIndex = i / 4;
    const y = Math.floor(pixelIndex / w);
    const scanline = y % 3 === 0 ? 0.7 : 1.0;

    data[i] = edgeValue * scanline;
    data[i + 1] = edgeValue * scanline;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
}

// ============================================================================
// EFFECT: THERMAL
// ============================================================================
export function applyThermalEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const sensitivity = 0.5 + param * 1.5;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = ((r + g + b) / 3) * sensitivity;
    const normalized = Math.min(1, brightness / 255);

    let tr = 0, tg = 0, tb = 0;

    // Heat gradient: dark blue → blue → red → orange → yellow → white
    if (normalized < 0.2) {
      tb = 255 * (normalized / 0.2);
    } else if (normalized < 0.4) {
      tg = 255 * ((normalized - 0.2) / 0.2);
      tb = 255;
    } else if (normalized < 0.6) {
      tr = 255 * ((normalized - 0.4) / 0.2);
      tg = 255;
      tb = 255 - 255 * ((normalized - 0.4) / 0.2);
    } else if (normalized < 0.8) {
      tr = 255;
      tg = 255 - 255 * ((normalized - 0.6) / 0.2);
      tb = 0;
    } else {
      tr = 255;
      tg = 255 * ((normalized - 0.8) / 0.2);
      tb = 255 * ((normalized - 0.8) / 0.2);
    }

    data[i] = Math.floor(tr);
    data[i + 1] = Math.floor(tg);
    data[i + 2] = Math.floor(tb);
    data[i + 3] = 255;
  }
}

// ============================================================================
// EFFECT: MATRIX
// ============================================================================
export function applyMatrixEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const colWidth = Math.max(3, Math.floor(param * 9 + 3));
  const time = Date.now() / 100;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % w;
    const y = Math.floor(pixelIndex / w);

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    const colIndex = Math.floor(x / colWidth);
    const colOffset = (time + colIndex * 5) % h;
    const distToCol = Math.abs(y - colOffset);
    const colIntensity = Math.max(0, 1 - distToCol / 20);

    data[i] = 0;
    data[i + 1] = Math.floor(brightness * (0.5 + colIntensity * 0.5));
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
}

// ============================================================================
// EFFECT: NEON
// ============================================================================
export function applyNeonEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const edgeMultiplier = 2 + param * 6;
  const time = Date.now() / 1000;
  const pulse = Math.sin(time * 2) * 0.5 + 0.5;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    const edgeValue = brightness * edgeMultiplier * (0.7 + pulse * 0.3);

    data[i] = Math.min(255, edgeValue);
    data[i + 1] = 0;
    data[i + 2] = Math.min(255, edgeValue);
    data[i + 3] = 255;
  }
}

// ============================================================================
// EFFECT: PARTICLE
// ============================================================================
export function applyParticleEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const blockSize = Math.max(2, Math.floor(param * 6 + 2));
  const time = Date.now() / 100;
  const strobePhase = Math.sin(time * 3) > 0 ? 1 : 0.5;

  for (let y = 0; y < h; y += blockSize) {
    for (let x = 0; x < w; x += blockSize) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const avgR = Math.floor(sumR / count);
      const avgG = Math.floor(sumG / count);
      const avgB = Math.floor(sumB / count);
      const brightness = (avgR + avgG + avgB) / 3;

      const hue = (brightness / 255) * 360;
      const sat = 1;
      const light = 0.5;
      const c = (1 - Math.abs(2 * light - 1)) * sat;
      const x_ = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = light - c / 2;

      let hr = 0, hg = 0, hb = 0;
      if (hue < 60) {
        hr = c;
        hg = x_;
      } else if (hue < 120) {
        hr = x_;
        hg = c;
      } else if (hue < 180) {
        hg = c;
        hb = x_;
      } else if (hue < 240) {
        hg = x_;
        hb = c;
      } else if (hue < 300) {
        hr = x_;
        hb = c;
      } else {
        hr = c;
        hb = x_;
      }

      const finalR = Math.floor((hr + m) * 255 * strobePhase);
      const finalG = Math.floor((hg + m) * 255 * strobePhase);
      const finalB = Math.floor((hb + m) * 255 * strobePhase);

      for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          data[idx] = finalR;
          data[idx + 1] = finalG;
          data[idx + 2] = finalB;
          data[idx + 3] = 255;
        }
      }
    }
  }
}

// ============================================================================
// EFFECT: MOSAIC
// ============================================================================
export function applyMosaicEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const blockSize = Math.max(4, Math.floor(param * 16 + 4));

  for (let y = 0; y < h; y += blockSize) {
    for (let x = 0; x < w; x += blockSize) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const avgR = Math.floor(sumR / count);
      const avgG = Math.floor(sumG / count);
      const avgB = Math.floor(sumB / count);

      // Boost saturation and contrast
      const brightness = (avgR + avgG + avgB) / 3;
      const r = Math.floor(avgR + (avgR - brightness) * 0.5);
      const g = Math.floor(avgG + (avgG - brightness) * 0.5);
      const b = Math.floor(avgB + (avgB - brightness) * 0.5);

      for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          data[idx] = Math.min(255, r);
          data[idx + 1] = Math.min(255, g);
          data[idx + 2] = Math.min(255, b);
          data[idx + 3] = 255;
        }
      }
    }
  }
}

// ============================================================================
// EFFECT: OPT FLOW (Optical Flow)
// ============================================================================
export function applyOptFlowEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number,
  prevFrameData: Uint8ClampedArray | null
): Uint8ClampedArray | null {
  const threshold = param * 50 + 10;

  if (!prevFrameData) {
    return new Uint8ClampedArray(data);
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const prevR = prevFrameData[i];
    const prevG = prevFrameData[i + 1];
    const prevB = prevFrameData[i + 2];

    const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);

    if (diff > threshold) {
      const hue = (diff / 255) * 360;
      const sat = 1;
      const light = 0.5;
      const c = (1 - Math.abs(2 * light - 1)) * sat;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = light - c / 2;

      let mr = 0, mg = 0, mb = 0;
      if (hue < 60) {
        mr = c;
        mg = x;
      } else if (hue < 120) {
        mr = x;
        mg = c;
      } else if (hue < 180) {
        mg = c;
        mb = x;
      } else if (hue < 240) {
        mg = x;
        mb = c;
      } else if (hue < 300) {
        mr = x;
        mb = c;
      } else {
        mr = c;
        mb = x;
      }

      data[i] = Math.floor((mr + m) * 255);
      data[i + 1] = Math.floor((mg + m) * 255);
      data[i + 2] = Math.floor((mb + m) * 255);
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
    data[i + 3] = 255;
  }

  return new Uint8ClampedArray(data);
}

// ============================================================================
// EFFECT: TIME SLICE
// ============================================================================
export function applyTimeSliceEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number,
  timeSliceBuffer: Uint8ClampedArray[]
): void {
  const tintIntensity = param * 0.5;

  for (let y = 0; y < h; y++) {
    const frameIdx = Math.min(
      Math.floor((y / h) * timeSliceBuffer.length),
      timeSliceBuffer.length - 1
    );

    if (frameIdx >= 0 && frameIdx < timeSliceBuffer.length) {
      const frameData = timeSliceBuffer[frameIdx];

      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstIdx = (y * w + x) * 4;

        data[dstIdx] = Math.floor(frameData[srcIdx] * (1 - tintIntensity * 0.3));
        data[dstIdx + 1] = Math.floor(frameData[srcIdx + 1] * (1 - tintIntensity * 0.3));
        data[dstIdx + 2] = Math.floor(frameData[srcIdx + 2] + tintIntensity * 50);
        data[dstIdx + 3] = 255;
      }

      // Draw band separator
      if (y % Math.ceil(h / 5) === 0) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          data[idx] = Math.floor(data[idx] * 0.7);
          data[idx + 1] = Math.floor(data[idx + 1] * 0.7);
          data[idx + 2] = Math.floor(data[idx + 2] * 0.7);
        }
      }
    }
  }
}

// ============================================================================
// EFFECT: ASCII
// ============================================================================
export function renderASCIIEffect(
  ctx: CanvasRenderingContext2D,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const cellSize = Math.max(1.5, param * 4.5 + 1.5);
  const chars = [' ', '.', ':', '+', '#', '@', '█'];

  // Clear to black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#88ff88';
  ctx.font = `${cellSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let y = 0; y < h; y += cellSize * 1.5) {
    for (let x = 0; x < w; x += cellSize) {
      let sumBrightness = 0;
      let count = 0;

      for (let dy = 0; dy < cellSize * 1.5 && y + dy < h; dy++) {
        for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          sumBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
      }

      const avgBrightness = sumBrightness / count / 255;
      const charIdx = Math.floor(avgBrightness * (chars.length - 1));
      ctx.fillText(chars[charIdx], x, y);
    }
  }
}

// ============================================================================
// EFFECT: ASCII OV (Overlay)
// ============================================================================
export function renderASCIIOVEffect(
  ctx: CanvasRenderingContext2D,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const cellSize = Math.max(2.5, param * 7.5 + 2.5);
  const chars = [' ', '.', 'e', '/', '+', '*', '=', '2'];

  // Blur original slightly
  ctx.filter = 'blur(2px)';
  const imageData = new ImageData(data, w, h);
  ctx.putImageData(imageData, 0, 0);
  ctx.filter = 'none';

  // Draw characters
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#ffffaa';
  ctx.font = `${cellSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let y = 0; y < h; y += cellSize * 1.4) {
    for (let x = 0; x < w; x += cellSize) {
      let sumBrightness = 0;
      let count = 0;

      for (let dy = 0; dy < cellSize * 1.4 && y + dy < h; dy++) {
        for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          sumBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
      }

      const avgBrightness = sumBrightness / count / 255;
      const charIdx = Math.floor(avgBrightness * (chars.length - 1));
      ctx.fillText(chars[charIdx], x, y);
    }
  }

  ctx.globalAlpha = 1;
}

// ============================================================================
// EFFECT: TRACKING (Blob Detection)
// ============================================================================
export function renderTrackingEffect(
  ctx: CanvasRenderingContext2D,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const threshold = param * 50 + 10;
  const blockSize = 8;

  // Detect motion blocks
  const blocks: boolean[][] = [];
  for (let by = 0; by < Math.ceil(h / blockSize); by++) {
    blocks[by] = [];
    for (let bx = 0; bx < Math.ceil(w / blockSize); bx++) {
      let sumBrightness = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize && by * blockSize + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && bx * blockSize + dx < w; dx++) {
          const idx = ((by * blockSize + dy) * w + (bx * blockSize + dx)) * 4;
          sumBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
      }

      blocks[by][bx] = sumBrightness / count > threshold;
    }
  }

  // Draw background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Draw tracking boxes
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  for (let by = 0; by < blocks.length; by++) {
    for (let bx = 0; bx < blocks[by].length; bx++) {
      if (blocks[by][bx]) {
        const x = bx * blockSize;
        const y = by * blockSize;

        // Corner brackets
        ctx.strokeRect(x + 2, y + 2, blockSize - 4, blockSize - 4);

        // Center crosshair
        ctx.beginPath();
        ctx.moveTo(x + blockSize / 2 - 3, y + blockSize / 2);
        ctx.lineTo(x + blockSize / 2 + 3, y + blockSize / 2);
        ctx.moveTo(x + blockSize / 2, y + blockSize / 2 - 3);
        ctx.lineTo(x + blockSize / 2, y + blockSize / 2 + 3);
        ctx.stroke();
      }
    }
  }
}

// ============================================================================
// EFFECT: FLOWER
// ============================================================================
export function renderFlowerEffect(
  ctx: CanvasRenderingContext2D,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const cellSize = Math.max(3, Math.floor(param * 9 + 3));

  // Clear to black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < h; y += cellSize) {
    for (let x = 0; x < w; x += cellSize) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let dy = 0; dy < cellSize && y + dy < h; dy++) {
        for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const avgR = Math.floor(sumR / count);
      const avgG = Math.floor(sumG / count);
      const avgB = Math.floor(sumB / count);
      const brightness = (avgR + avgG + avgB) / 3 / 255;

      ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
      ctx.beginPath();

      const centerX = x + cellSize / 2;
      const centerY = y + cellSize / 2;
      const petalRadius = cellSize * brightness * 0.6;

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const px = centerX + Math.cos(angle) * petalRadius;
        const py = centerY + Math.sin(angle) * petalRadius;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.closePath();
      ctx.fill();
    }
  }
}

// ============================================================================
// EFFECT: GLASS (3D Glass Sphere)
// ============================================================================
export function applyGlassEffect(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  param: number
): void {
  const refractIndex = 1 + param * 0.5;
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 3;

  const tempData = new Uint8ClampedArray(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        // Ray-sphere intersection for refraction
        const angle = Math.atan2(dy, dx);
        const refractedDist = Math.min(dist * refractIndex, radius);
        const srcX = Math.floor(centerX + Math.cos(angle) * refractedDist);
        const srcY = Math.floor(centerY + Math.sin(angle) * refractedDist);

        if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
          const srcIdx = (srcY * w + srcX) * 4;
          const dstIdx = (y * w + x) * 4;

          // Chromatic aberration
          const aberration = 2;
          const rIdx = ((srcY - aberration) * w + srcX) * 4;
          const bIdx = ((srcY + aberration) * w + srcX) * 4;

          data[dstIdx] = tempData[rIdx] || tempData[srcIdx];
          data[dstIdx + 1] = tempData[srcIdx + 1];
          data[dstIdx + 2] = tempData[bIdx + 2] || tempData[srcIdx + 2];

          // Fresnel rim glow
          const fresnel = Math.pow(1 - Math.abs(dist / radius), 2);
          data[dstIdx] = Math.floor(data[dstIdx] + fresnel * 50);
          data[dstIdx + 1] = Math.floor(data[dstIdx + 1] + fresnel * 30);
          data[dstIdx + 2] = Math.floor(data[dstIdx + 2] + fresnel * 80);
        }
      }

      data[y * w * 4 + x * 4 + 3] = 255;
    }
  }
}
