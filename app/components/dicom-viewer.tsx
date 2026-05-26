'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move, 
  Contrast,
  Ruler,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Grid,
  Loader2
} from 'lucide-react';

interface DicomViewerProps {
  imageId?: string;
  sopInstanceUID?: string;
  studyUID?: string;
  seriesUID?: string;
  imageIds?: string[]; // For multi-image series
  className?: string;
  onImageLoad?: () => void;
  onError?: (error: string) => void;
}

// Window presets for different tissue types
const WINDOW_PRESETS = [
  { name: 'Default', ww: 400, wc: 40 },
  { name: 'Lung', ww: 1500, wc: -600 },
  { name: 'Bone', ww: 2000, wc: 300 },
  { name: 'Soft Tissue', ww: 400, wc: 40 },
  { name: 'Brain', ww: 80, wc: 40 },
  { name: 'Liver', ww: 150, wc: 30 },
  { name: 'Abdomen', ww: 350, wc: 50 },
];

type ActiveTool = 'pan' | 'zoom' | 'window' | 'measure';

export default function DicomViewer({
  imageId,
  sopInstanceUID,
  studyUID,
  seriesUID,
  imageIds = [],
  className = '',
  onImageLoad,
  onError,
}: DicomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ActiveTool>('window');
  const [windowLevel, setWindowLevel] = useState({ ww: 400, wc: 40 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageData, setImageData] = useState<{
    pixelData: Uint8Array | Uint16Array | Int16Array | null;
    width: number;
    height: number;
    bitsAllocated: number;
    photometricInterpretation: string;
    windowCenter: number;
    windowWidth: number;
    rescaleSlope: number;
    rescaleIntercept: number;
  } | null>(null);

  // Mouse interaction state
  const mouseState = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startWW: 400,
    startWC: 40,
    startPanX: 0,
    startPanY: 0,
  });

  // Load DICOM image
  const loadImage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build the URL for fetching the DICOM file
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
        // Try to get error message from response
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
      const highBit = dataSet.uint16('x00280102') || bitsStored - 1;
      const pixelRepresentation = dataSet.uint16('x00280103') || 0;
      const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';
      const windowCenter = parseFloat(dataSet.string('x00281050') || '40');
      const windowWidth = parseFloat(dataSet.string('x00281051') || '400');
      const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1');
      const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0');

      // Get pixel data element
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        throw new Error('No pixel data found in DICOM file');
      }

      // Extract pixel data
      let pixelData: Uint8Array | Uint16Array | Int16Array;
      const pixelDataOffset = pixelDataElement.dataOffset;
      const pixelDataLength = pixelDataElement.length;

      if (bitsAllocated === 8) {
        pixelData = new Uint8Array(byteArray.buffer, pixelDataOffset, pixelDataLength);
      } else if (bitsAllocated === 16) {
        if (pixelRepresentation === 0) {
          pixelData = new Uint16Array(byteArray.buffer, pixelDataOffset, pixelDataLength / 2);
        } else {
          pixelData = new Int16Array(byteArray.buffer, pixelDataOffset, pixelDataLength / 2);
        }
      } else {
        throw new Error(`Unsupported bits allocated: ${bitsAllocated}`);
      }

      setImageData({
        pixelData,
        width: columns,
        height: rows,
        bitsAllocated,
        photometricInterpretation,
        windowCenter,
        windowWidth,
        rescaleSlope,
        rescaleIntercept,
      });

      setWindowLevel({ ww: windowWidth, wc: windowCenter });
      setIsLoading(false);
      onImageLoad?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [imageId, sopInstanceUID, studyUID, seriesUID, onImageLoad, onError]);

  // Render the image to canvas
  const renderImage = useCallback(() => {
    if (!canvasRef.current || !imageData?.pixelData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { pixelData, width, height, rescaleSlope, rescaleIntercept, photometricInterpretation } = imageData;
    const { ww, wc } = windowLevel;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Create image data
    const imageDataObj = ctx.createImageData(width, height);
    const data = imageDataObj.data;

    // Apply windowing and create grayscale image
    const windowMin = wc - ww / 2;
    const windowMax = wc + ww / 2;
    const isInverted = photometricInterpretation === 'MONOCHROME1';

    for (let i = 0; i < pixelData.length; i++) {
      // Apply rescale
      let value = pixelData[i] * rescaleSlope + rescaleIntercept;

      // Apply windowing
      let normalized: number;
      if (value <= windowMin) {
        normalized = 0;
      } else if (value >= windowMax) {
        normalized = 255;
      } else {
        normalized = Math.round(((value - windowMin) / ww) * 255);
      }

      // Handle photometric interpretation
      if (isInverted) {
        normalized = 255 - normalized;
      }

      // Set RGBA values
      const pixelIndex = i * 4;
      data[pixelIndex] = normalized;
      data[pixelIndex + 1] = normalized;
      data[pixelIndex + 2] = normalized;
      data[pixelIndex + 3] = 255;
    }

    ctx.putImageData(imageDataObj, 0, 0);
  }, [imageData, windowLevel]);

  // Draw the canvas with transformations
  const drawCanvas = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Apply CSS transformations for zoom, pan, rotation
    const transforms = [
      `translate(${pan.x}px, ${pan.y}px)`,
      `scale(${zoom})`,
      `rotate(${rotation}deg)`,
    ];
    canvas.style.transform = transforms.join(' ');
  }, [zoom, pan, rotation]);

  // Load image on mount
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Render when image data or window level changes
  useEffect(() => {
    renderImage();
    drawCanvas();
  }, [renderImage, drawCanvas]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseState.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startWW: windowLevel.ww,
      startWC: windowLevel.wc,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseState.current.isDown) return;

    const deltaX = e.clientX - mouseState.current.startX;
    const deltaY = e.clientY - mouseState.current.startY;

    switch (activeTool) {
      case 'window':
        // Horizontal = window width, Vertical = window center
        setWindowLevel({
          ww: Math.max(1, mouseState.current.startWW + deltaX * 2),
          wc: mouseState.current.startWC + deltaY * 2,
        });
        break;
      case 'pan':
        setPan({
          x: mouseState.current.startPanX + deltaX,
          y: mouseState.current.startPanY + deltaY,
        });
        break;
      case 'zoom':
        const zoomDelta = 1 + deltaY * 0.005;
        setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomDelta)));
        mouseState.current.startY = e.clientY;
        break;
    }
  };

  const handleMouseUp = () => {
    mouseState.current.isDown = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Zoom with Ctrl+Wheel
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomDelta)));
    } else if (imageIds.length > 1) {
      // Scroll through images
      const newIndex = currentImageIndex + (e.deltaY > 0 ? 1 : -1);
      if (newIndex >= 0 && newIndex < imageIds.length) {
        setCurrentImageIndex(newIndex);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    if (imageData) {
      setWindowLevel({
        ww: imageData.windowWidth,
        wc: imageData.windowCenter,
      });
    }
  };

  // Apply window preset
  const applyPreset = (preset: typeof WINDOW_PRESETS[0]) => {
    setWindowLevel({ ww: preset.ww, wc: preset.wc });
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white p-4 ${className}`}>
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-300 mb-2 font-medium">DICOM Image Preview</p>
          <p className="text-sm text-gray-500 mb-4">
            {error.includes('Failed to read') || error.includes('not found') 
              ? 'Image file not available on server. In production, DICOM files will be stored and viewable here.'
              : error}
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={loadImage}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
            >
              Retry
            </button>
          </div>
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Canvas container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full transition-transform"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Toolbar */}
      <div className="absolute top-2 left-2 flex gap-1 z-20">
        <button
          onClick={() => setActiveTool('window')}
          className={`p-2 rounded ${activeTool === 'window' ? 'bg-blue-600' : 'bg-gray-800/80'} text-white hover:bg-blue-700`}
          title="Window/Level (drag to adjust)"
        >
          <Contrast className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTool('pan')}
          className={`p-2 rounded ${activeTool === 'pan' ? 'bg-blue-600' : 'bg-gray-800/80'} text-white hover:bg-blue-700`}
          title="Pan"
        >
          <Move className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTool('zoom')}
          className={`p-2 rounded ${activeTool === 'zoom' ? 'bg-blue-600' : 'bg-gray-800/80'} text-white hover:bg-blue-700`}
          title="Zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTool('measure')}
          className={`p-2 rounded ${activeTool === 'measure' ? 'bg-blue-600' : 'bg-gray-800/80'} text-white hover:bg-blue-700`}
          title="Measure"
        >
          <Ruler className="h-4 w-4" />
        </button>
        <div className="w-px bg-gray-600 mx-1" />
        <button
          onClick={() => setZoom(prev => prev * 1.2)}
          className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom(prev => prev * 0.8)}
          className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setRotation(prev => (prev + 90) % 360)}
          className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="Reset View"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Window presets */}
      <div className="absolute top-2 right-2 z-20">
        <select
          onChange={(e) => {
            const preset = WINDOW_PRESETS.find(p => p.name === e.target.value);
            if (preset) applyPreset(preset);
          }}
          className="px-2 py-1 rounded bg-gray-800/80 text-white text-sm border border-gray-600"
        >
          <option value="">Window Presets</option>
          {WINDOW_PRESETS.map(preset => (
            <option key={preset.name} value={preset.name}>{preset.name}</option>
          ))}
        </select>
      </div>

      {/* Image info overlay */}
      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/60 p-2 rounded z-20">
        <div>W: {Math.round(windowLevel.ww)} / L: {Math.round(windowLevel.wc)}</div>
        <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
        {imageData && (
          <div>{imageData.width} x {imageData.height}</div>
        )}
        {imageIds.length > 1 && (
          <div>Image: {currentImageIndex + 1} / {imageIds.length}</div>
        )}
      </div>

      {/* Series navigation */}
      {imageIds.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-2 z-20">
          <button
            onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
            disabled={currentImageIndex === 0}
            className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentImageIndex(prev => Math.min(imageIds.length - 1, prev + 1))}
            disabled={currentImageIndex === imageIds.length - 1}
            className="p-2 rounded bg-gray-800/80 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
