'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Move,
  Contrast,
  Ruler,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  Download,
  MousePointer,
  Info,
  X,
  Sun,
} from 'lucide-react';

// Types
interface ViewerProps {
  imageId?: string;
  sopInstanceUID?: string;
  studyUID?: string;
  seriesUID?: string;
  imageIds?: string[];
  className?: string;
  onImageLoad?: () => void;
  onError?: (error: string) => void;
  showToolbar?: boolean;
  showOverlay?: boolean;
  initialTool?: ToolName;
}

type ToolName = 'WindowLevel' | 'Pan' | 'Zoom' | 'Length' | 'Probe';

interface WindowPreset {
  name: string;
  ww: number;
  wc: number;
}

interface Measurement {
  id: string;
  type: 'length' | 'probe';
  points: { x: number; y: number }[];
  value?: number;
  unit?: string;
}

// Window presets for different tissue types
const WINDOW_PRESETS: WindowPreset[] = [
  { name: 'Auto', ww: 0, wc: 0 },
  { name: 'Lung', ww: 1500, wc: -600 },
  { name: 'Mediastinum', ww: 350, wc: 50 },
  { name: 'Bone', ww: 2000, wc: 300 },
  { name: 'Brain', ww: 80, wc: 40 },
  { name: 'Stroke', ww: 40, wc: 40 },
  { name: 'Soft Tissue', ww: 400, wc: 40 },
  { name: 'Liver', ww: 150, wc: 30 },
  { name: 'Abdomen', ww: 350, wc: 50 },
  { name: 'Spine', ww: 250, wc: 50 },
  { name: 'Chest', ww: 350, wc: 40 },
];

// Tool configurations
const TOOLS: { name: ToolName; icon: any; label: string; shortcut: string }[] = [
  { name: 'WindowLevel', icon: Contrast, label: 'Window/Level', shortcut: 'W' },
  { name: 'Pan', icon: Move, label: 'Pan', shortcut: 'P' },
  { name: 'Zoom', icon: ZoomIn, label: 'Zoom', shortcut: 'Z' },
  { name: 'Length', icon: Ruler, label: 'Measure Length', shortcut: 'L' },
  { name: 'Probe', icon: MousePointer, label: 'Probe Value', shortcut: 'B' },
];

export default function AdvancedDicomViewer({
  imageId,
  sopInstanceUID,
  studyUID,
  seriesUID,
  imageIds = [],
  className = '',
  onImageLoad,
  onError,
  showToolbar = true,
  showOverlay = true,
  initialTool = 'WindowLevel',
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolName>(initialTool);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameRate, setFrameRate] = useState(10);
  const [showHelp, setShowHelp] = useState(false);
  
  // Image data state
  const [imageData, setImageData] = useState<{
    pixelData: Uint8Array | Uint16Array | Int16Array | null;
    width: number;
    height: number;
    bitsAllocated: number;
    bitsStored: number;
    photometricInterpretation: string;
    windowCenter: number;
    windowWidth: number;
    rescaleSlope: number;
    rescaleIntercept: number;
    pixelSpacing: number[];
    sliceThickness: number;
    patientName: string;
    patientId: string;
    studyDate: string;
    modality: string;
    seriesDescription: string;
    instanceNumber: number;
  } | null>(null);

  // Viewport state
  const [viewport, setViewport] = useState({
    scale: 1,
    rotation: 0,
    hflip: false,
    vflip: false,
    windowWidth: 400,
    windowCenter: 40,
    invert: false,
    panX: 0,
    panY: 0,
  });

  // Measurements state
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMeasurement, setActiveMeasurement] = useState<Measurement | null>(null);
  const [probeValue, setProbeValue] = useState<{ x: number; y: number; value: number } | null>(null);

  // Mouse state
  const mouseStateRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startWW: 400,
    startWC: 40,
    startScale: 1,
    startPanX: 0,
    startPanY: 0,
  });

  // CINE playback
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load DICOM image
  const loadImage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = '/api/dicom/wado?';
      if (imageId) {
        url += `imageId=${imageId}`;
      } else if (sopInstanceUID) {
        url += `sopInstanceUID=${sopInstanceUID}`;
      } else if (studyUID && seriesUID) {
        url += `studyUID=${studyUID}&seriesUID=${seriesUID}`;
      } else {
        throw new Error('No image identifier provided');
      }

      const response = await fetch(url);
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load DICOM image');
        }
        throw new Error(`Failed to load DICOM image (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);

      // Import dicom-parser dynamically
      const dicomParser = await import('dicom-parser');
      const dataSet = dicomParser.parseDicom(byteArray);

      // Extract image parameters
      const rows = dataSet.uint16('x00280010') || 0;
      const columns = dataSet.uint16('x00280011') || 0;
      const bitsAllocated = dataSet.uint16('x00280100') || 16;
      const bitsStored = dataSet.uint16('x00280101') || 12;
      const pixelRepresentation = dataSet.uint16('x00280103') || 0;
      const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';
      const windowCenter = parseFloat(dataSet.string('x00281050') || '40');
      const windowWidth = parseFloat(dataSet.string('x00281051') || '400');
      const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
      const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');

      // Extract pixel spacing
      const pixelSpacingStr = dataSet.string('x00280030') || '';
      const pixelSpacing = pixelSpacingStr.split('\\').map(parseFloat).filter(n => !isNaN(n));
      const sliceThickness = parseFloat(dataSet.string('x00180050') || '0');

      // Extract patient/study info
      const patientName = dataSet.string('x00100010') || '';
      const patientId = dataSet.string('x00100020') || '';
      const studyDate = dataSet.string('x00080020') || '';
      const modality = dataSet.string('x00080060') || '';
      const seriesDescription = dataSet.string('x0008103e') || '';
      const instanceNumber = dataSet.uint16('x00200013') || 0;

      // Get pixel data
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        throw new Error('No pixel data found in DICOM file');
      }

      let pixelData: Uint8Array | Uint16Array | Int16Array;
      const offset = pixelDataElement.dataOffset;
      const length = pixelDataElement.length;

      if (bitsAllocated === 8) {
        pixelData = new Uint8Array(byteArray.buffer, offset, length);
      } else if (bitsAllocated === 16) {
        if (pixelRepresentation === 0) {
          pixelData = new Uint16Array(byteArray.buffer, offset, length / 2);
        } else {
          pixelData = new Int16Array(byteArray.buffer, offset, length / 2);
        }
      } else {
        throw new Error(`Unsupported bits allocated: ${bitsAllocated}`);
      }

      setImageData({
        pixelData,
        width: columns,
        height: rows,
        bitsAllocated,
        bitsStored,
        photometricInterpretation,
        windowCenter,
        windowWidth,
        rescaleSlope,
        rescaleIntercept,
        pixelSpacing: pixelSpacing.length === 2 ? pixelSpacing : [1, 1],
        sliceThickness,
        patientName,
        patientId,
        studyDate,
        modality,
        seriesDescription,
        instanceNumber,
      });

      setViewport(prev => ({
        ...prev,
        windowWidth,
        windowCenter,
      }));

      setIsLoading(false);
      onImageLoad?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [imageId, sopInstanceUID, studyUID, seriesUID, onImageLoad, onError]);

  // Render image to canvas
  const renderImage = useCallback(() => {
    if (!canvasRef.current || !imageData?.pixelData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { pixelData, width, height, rescaleSlope, rescaleIntercept, photometricInterpretation } = imageData;
    const { windowWidth: ww, windowCenter: wc, invert } = viewport;

    canvas.width = width;
    canvas.height = height;

    const imageDataObj = ctx.createImageData(width, height);
    const pixels = imageDataObj.data;

    const windowMin = wc - ww / 2;
    const windowMax = wc + ww / 2;
    const isInverted = photometricInterpretation === 'MONOCHROME1' !== invert;

    for (let i = 0; i < pixelData.length; i++) {
      let value = pixelData[i] * rescaleSlope + rescaleIntercept;

      let normalized: number;
      if (value <= windowMin) {
        normalized = 0;
      } else if (value >= windowMax) {
        normalized = 255;
      } else {
        normalized = Math.round(((value - windowMin) / ww) * 255);
      }

      if (isInverted) {
        normalized = 255 - normalized;
      }

      const idx = i * 4;
      pixels[idx] = normalized;
      pixels[idx + 1] = normalized;
      pixels[idx + 2] = normalized;
      pixels[idx + 3] = 255;
    }

    ctx.putImageData(imageDataObj, 0, 0);
  }, [imageData, viewport]);

  // Render measurement overlay
  const renderOverlay = useCallback(() => {
    if (!overlayCanvasRef.current || !imageData) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw measurements
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.font = '14px Arial';

    measurements.forEach(measurement => {
      if (measurement.type === 'length' && measurement.points.length === 2) {
        const [p1, p2] = measurement.points;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Draw endpoints
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Calculate and display length
        const pixelSpacing = imageData.pixelSpacing;
        const dx = (p2.x - p1.x) * pixelSpacing[0];
        const dy = (p2.y - p1.y) * pixelSpacing[1];
        const lengthMm = Math.sqrt(dx * dx + dy * dy);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(midX + 5, midY - 18, 80, 20);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`${lengthMm.toFixed(1)} mm`, midX + 10, midY - 3);
      }
    });

    // Draw active measurement
    if (activeMeasurement && activeMeasurement.points.length === 1) {
      ctx.beginPath();
      ctx.arc(activeMeasurement.points[0].x, activeMeasurement.points[0].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw probe value
    if (probeValue) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(probeValue.x + 10, probeValue.y - 25, 100, 25);
      ctx.fillStyle = '#ffff00';
      ctx.fillText(`HU: ${probeValue.value.toFixed(0)}`, probeValue.x + 15, probeValue.y - 8);
    }
  }, [imageData, measurements, activeMeasurement, probeValue]);

  // Apply canvas transforms
  const applyTransforms = useCallback(() => {
    if (!canvasRef.current || !overlayCanvasRef.current) return;

    const transforms = [
      `translate(${viewport.panX}px, ${viewport.panY}px)`,
      `scale(${viewport.hflip ? -viewport.scale : viewport.scale}, ${viewport.vflip ? -viewport.scale : viewport.scale})`,
      `rotate(${viewport.rotation}deg)`,
    ];
    const transformStr = transforms.join(' ');
    canvasRef.current.style.transform = transformStr;
    overlayCanvasRef.current.style.transform = transformStr;
  }, [viewport]);

  // Get image coordinates from mouse event
  const getImageCoords = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    if (!canvasRef.current || !imageData) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = imageData.width / (rect.width / viewport.scale);
    const scaleY = imageData.height / (rect.height / viewport.scale);

    const x = Math.round((e.clientX - rect.left - viewport.panX) * scaleX / viewport.scale);
    const y = Math.round((e.clientY - rect.top - viewport.panY) * scaleY / viewport.scale);

    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      return null;
    }

    return { x, y };
  }, [imageData, viewport]);

  // Get pixel value at coordinates
  const getPixelValue = useCallback((x: number, y: number): number | null => {
    if (!imageData?.pixelData) return null;
    
    const idx = y * imageData.width + x;
    if (idx < 0 || idx >= imageData.pixelData.length) return null;
    
    return imageData.pixelData[idx] * imageData.rescaleSlope + imageData.rescaleIntercept;
  }, [imageData]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getImageCoords(e);

    if (activeTool === 'Length' && coords) {
      if (!activeMeasurement) {
        setActiveMeasurement({
          id: Date.now().toString(),
          type: 'length',
          points: [coords],
        });
      } else if (activeMeasurement.points.length === 1) {
        const completedMeasurement = {
          ...activeMeasurement,
          points: [...activeMeasurement.points, coords],
        };
        setMeasurements(prev => [...prev, completedMeasurement]);
        setActiveMeasurement(null);
      }
      return;
    }

    if (activeTool === 'Probe' && coords) {
      const value = getPixelValue(coords.x, coords.y);
      if (value !== null) {
        setProbeValue({ ...coords, value });
      }
      return;
    }

    mouseStateRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startWW: viewport.windowWidth,
      startWC: viewport.windowCenter,
      startScale: viewport.scale,
      startPanX: viewport.panX,
      startPanY: viewport.panY,
    };
  }, [activeTool, activeMeasurement, viewport, getImageCoords, getPixelValue]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseStateRef.current.isDown) return;

    const deltaX = e.clientX - mouseStateRef.current.startX;
    const deltaY = e.clientY - mouseStateRef.current.startY;

    switch (activeTool) {
      case 'WindowLevel':
        setViewport(prev => ({
          ...prev,
          windowWidth: Math.max(1, mouseStateRef.current.startWW + deltaX * 2),
          windowCenter: mouseStateRef.current.startWC + deltaY * 2,
        }));
        break;
      case 'Pan':
        setViewport(prev => ({
          ...prev,
          panX: mouseStateRef.current.startPanX + deltaX,
          panY: mouseStateRef.current.startPanY + deltaY,
        }));
        break;
      case 'Zoom':
        const zoomFactor = 1 - deltaY * 0.005;
        setViewport(prev => ({
          ...prev,
          scale: Math.max(0.1, Math.min(10, mouseStateRef.current.startScale * zoomFactor)),
        }));
        break;
    }
  }, [activeTool]);

  const handleMouseUp = useCallback(() => {
    mouseStateRef.current.isDown = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(prev => ({
        ...prev,
        scale: Math.max(0.1, Math.min(10, prev.scale * zoomFactor)),
      }));
    } else if (imageIds.length > 1) {
      const newIndex = currentImageIndex + (e.deltaY > 0 ? 1 : -1);
      if (newIndex >= 0 && newIndex < imageIds.length) {
        setCurrentImageIndex(newIndex);
      }
    }
  }, [imageIds.length, currentImageIndex]);

  // Viewport manipulations
  const resetView = useCallback(() => {
    if (imageData) {
      setViewport({
        scale: 1,
        rotation: 0,
        hflip: false,
        vflip: false,
        windowWidth: imageData.windowWidth,
        windowCenter: imageData.windowCenter,
        invert: false,
        panX: 0,
        panY: 0,
      });
    }
    setMeasurements([]);
    setActiveMeasurement(null);
    setProbeValue(null);
  }, [imageData]);

  const rotateImage = useCallback((degrees: number) => {
    setViewport(prev => ({
      ...prev,
      rotation: (prev.rotation + degrees + 360) % 360,
    }));
  }, []);

  const flipImage = useCallback((direction: 'h' | 'v') => {
    setViewport(prev => ({
      ...prev,
      hflip: direction === 'h' ? !prev.hflip : prev.hflip,
      vflip: direction === 'v' ? !prev.vflip : prev.vflip,
    }));
  }, []);

  const invertImage = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      invert: !prev.invert,
    }));
  }, []);

  const zoomImage = useCallback((factor: number) => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(10, prev.scale * factor)),
    }));
  }, []);

  const applyPreset = useCallback((preset: WindowPreset) => {
    if (preset.name === 'Auto' && imageData) {
      setViewport(prev => ({
        ...prev,
        windowWidth: imageData.windowWidth,
        windowCenter: imageData.windowCenter,
      }));
    } else {
      setViewport(prev => ({
        ...prev,
        windowWidth: preset.ww,
        windowCenter: preset.wc,
      }));
    }
  }, [imageData]);

  // CINE playback
  const toggleCine = useCallback(() => {
    if (isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else if (imageIds.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % imageIds.length);
      }, 1000 / frameRate);
      setIsPlaying(true);
    }
  }, [isPlaying, imageIds.length, frameRate]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Download image
  const downloadImage = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `dicom-image-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, []);

  // Clear measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setActiveMeasurement(null);
    setProbeValue(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const shortcuts: Record<string, () => void> = {
        'w': () => setActiveTool('WindowLevel'),
        'p': () => setActiveTool('Pan'),
        'z': () => setActiveTool('Zoom'),
        'l': () => setActiveTool('Length'),
        'b': () => setActiveTool('Probe'),
        'i': invertImage,
        'f': toggleFullscreen,
        ' ': toggleCine,
        'Escape': resetView,
        'Delete': clearMeasurements,
        'ArrowLeft': () => imageIds.length > 1 && setCurrentImageIndex(prev => Math.max(0, prev - 1)),
        'ArrowRight': () => imageIds.length > 1 && setCurrentImageIndex(prev => Math.min(imageIds.length - 1, prev + 1)),
      };

      const handler = shortcuts[e.key.toLowerCase()] || shortcuts[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invertImage, toggleFullscreen, toggleCine, resetView, clearMeasurements, imageIds.length]);

  // Load image on mount
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Render when data changes
  useEffect(() => {
    renderImage();
    renderOverlay();
    applyTransforms();
  }, [renderImage, renderOverlay, applyTransforms]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white p-4 ${className}`}>
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-300 mb-2 font-medium">DICOM Image Error</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadImage}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black overflow-hidden select-none ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading DICOM image...</p>
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute max-w-full max-h-full pointer-events-none"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Toolbar */}
      {showToolbar && (
        <>
          {/* Main toolbar */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-20 max-w-[calc(100%-140px)]">
            {TOOLS.map((tool) => (
              <button
                key={tool.name}
                onClick={() => setActiveTool(tool.name)}
                className={`p-2 rounded transition-colors ${
                  activeTool === tool.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800/80 text-white hover:bg-gray-700'
                }`}
                title={`${tool.label} (${tool.shortcut})`}
              >
                <tool.icon className="h-4 w-4" />
              </button>
            ))}

            <div className="w-px bg-gray-600 mx-1" />

            {/* Zoom controls */}
            <button
              onClick={() => zoomImage(1.2)}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => zoomImage(0.8)}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <div className="w-px bg-gray-600 mx-1" />

            {/* Rotation controls */}
            <button
              onClick={() => rotateImage(-90)}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Rotate Left"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => rotateImage(90)}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Rotate Right"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Flip controls */}
            <button
              onClick={() => flipImage('h')}
              className={`p-2 rounded transition-colors ${
                viewport.hflip ? 'bg-blue-600' : 'bg-gray-800/80'
              } text-white hover:bg-gray-700`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={() => flipImage('v')}
              className={`p-2 rounded transition-colors ${
                viewport.vflip ? 'bg-blue-600' : 'bg-gray-800/80'
              } text-white hover:bg-gray-700`}
              title="Flip Vertical"
            >
              <FlipVertical className="h-4 w-4" />
            </button>

            <div className="w-px bg-gray-600 mx-1" />

            {/* Invert */}
            <button
              onClick={invertImage}
              className={`p-2 rounded transition-colors ${
                viewport.invert ? 'bg-blue-600' : 'bg-gray-800/80'
              } text-white hover:bg-gray-700`}
              title="Invert (I)"
            >
              <Sun className="h-4 w-4" />
            </button>

            {/* Reset */}
            <button
              onClick={resetView}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Reset View (Esc)"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Clear measurements */}
            {measurements.length > 0 && (
              <button
                onClick={clearMeasurements}
                className="p-2 rounded bg-red-600/80 text-white hover:bg-red-700"
                title="Clear Measurements (Del)"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Right toolbar */}
          <div className="absolute top-2 right-2 flex gap-1 z-20">
            {/* Window presets dropdown */}
            <select
              onChange={(e) => {
                const preset = WINDOW_PRESETS.find((p) => p.name === e.target.value);
                if (preset) applyPreset(preset);
              }}
              className="px-2 py-1.5 rounded bg-gray-800/80 text-white text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Presets</option>
              {WINDOW_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>

            {/* Download */}
            <button
              onClick={downloadImage}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Download Image"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* CINE controls */}
          {imageIds.length > 1 && (
            <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-20 bg-gray-800/80 rounded-lg p-2">
              <button
                onClick={() => setCurrentImageIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentImageIndex === 0}
                className="p-1 rounded text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={toggleCine}
                className={`p-2 rounded ${isPlaying ? 'bg-red-600' : 'bg-blue-600'} text-white hover:opacity-90`}
                title="Play/Pause (Space)"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>

              <span className="text-white text-sm min-w-[60px] text-center">
                {currentImageIndex + 1} / {imageIds.length}
              </span>

              <button
                onClick={() => setCurrentImageIndex((prev) => Math.min(imageIds.length - 1, prev + 1))}
                disabled={currentImageIndex === imageIds.length - 1}
                className="p-1 rounded text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="w-px h-6 bg-gray-600 mx-1" />

              <label className="flex items-center gap-1 text-white text-xs">
                FPS:
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={frameRate}
                  onChange={(e) => setFrameRate(Math.max(1, Math.min(30, parseInt(e.target.value) || 10)))}
                  className="w-12 px-1 py-0.5 rounded bg-gray-700 text-white text-center"
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* Image info overlay */}
      {showOverlay && imageData && (
        <>
          {/* Top-left patient info */}
          <div className="absolute top-14 left-2 text-white text-xs bg-black/60 p-2 rounded z-10 max-w-[200px]">
            {imageData.patientName && (
              <div className="truncate">Patient: {imageData.patientName.replace(/\^/g, ' ')}</div>
            )}
            {imageData.patientId && <div className="truncate">ID: {imageData.patientId}</div>}
            {imageData.studyDate && (
              <div>
                Date: {imageData.studyDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
              </div>
            )}
            {imageData.modality && <div>Modality: {imageData.modality}</div>}
          </div>

          {/* Bottom-left technical info */}
          <div className="absolute bottom-2 left-2 text-white text-xs bg-black/60 p-2 rounded z-10">
            <div>
              W: {Math.round(viewport.windowWidth)} / L: {Math.round(viewport.windowCenter)}
            </div>
            <div>Zoom: {(viewport.scale * 100).toFixed(0)}%</div>
            <div>
              {imageData.width} x {imageData.height}
            </div>
            {imageData.sliceThickness > 0 && (
              <div>Thickness: {imageData.sliceThickness.toFixed(1)}mm</div>
            )}
            {imageIds.length > 1 && (
              <div>
                Image: {currentImageIndex + 1} / {imageIds.length}
              </div>
            )}
          </div>

          {/* Top-right series info */}
          {imageData.seriesDescription && (
            <div className="absolute top-14 right-2 text-white text-xs bg-black/60 p-2 rounded z-10 max-w-[200px]">
              <div className="truncate">{imageData.seriesDescription}</div>
              {imageData.instanceNumber > 0 && <div>Instance: {imageData.instanceNumber}</div>}
            </div>
          )}
        </>
      )}

      {/* Help button */}
      <div className="absolute bottom-2 right-2 z-10">
        <button
          onClick={() => setShowHelp(true)}
          className="p-1.5 rounded bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700"
          title="Keyboard Shortcuts"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md text-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">W</div><div>Window/Level tool</div>
              <div className="text-gray-400">P</div><div>Pan tool</div>
              <div className="text-gray-400">Z</div><div>Zoom tool</div>
              <div className="text-gray-400">L</div><div>Length measurement</div>
              <div className="text-gray-400">B</div><div>Probe (pixel value)</div>
              <div className="text-gray-400">I</div><div>Invert image</div>
              <div className="text-gray-400">F</div><div>Toggle fullscreen</div>
              <div className="text-gray-400">Space</div><div>Play/Pause CINE</div>
              <div className="text-gray-400">Esc</div><div>Reset view</div>
              <div className="text-gray-400">Delete</div><div>Clear measurements</div>
              <div className="text-gray-400">Ctrl+Wheel</div><div>Zoom</div>
              <div className="text-gray-400">Wheel</div><div>Scroll images</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
