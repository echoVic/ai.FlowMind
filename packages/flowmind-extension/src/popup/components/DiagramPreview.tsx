import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Download, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Wand2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DiagramPreviewProps {
  diagramCode: string;
  isLoading?: boolean;
  onOptimize?: () => void;
}

const DiagramPreview: React.FC<DiagramPreviewProps> = ({
  diagramCode,
  isLoading = false,
  onOptimize
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isRendering, setIsRendering] = useState(false);

  // Initialize Mermaid with CSP-compatible settings
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose', // Required for Chrome extension
      fontFamily: 'system-ui, -apple-system, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: false // Better CSP compatibility
      },
      sequence: {
        useMaxWidth: true,
        wrap: true
      },
      gantt: {
        useMaxWidth: true
      }
    });
  }, []);

  // Render diagram
  const renderDiagram = useCallback(async () => {
    if (!diagramCode.trim() || !containerRef.current) return;

    setIsRendering(true);
    setError(null);

    try {
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // Generate unique ID for this render
      const id = `mermaid-${Date.now()}`;
      
      // Validate and render
      const isValid = await mermaid.parse(diagramCode);
      if (!isValid) {
        throw new Error('Invalid Mermaid syntax');
      }

      const { svg } = await mermaid.render(id, diagramCode);
      
      // Insert SVG
      containerRef.current.innerHTML = svg;
      
      // Get reference to the SVG element
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgRef.current = svgElement;
        
        // Set initial styles for zoom functionality
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
        svgElement.style.transform = `scale(${zoom})`;
        svgElement.style.transformOrigin = 'top left';
        svgElement.style.transition = 'transform 0.2s ease';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
      setError(errorMessage);
      console.error('Mermaid render error:', err);
    } finally {
      setIsRendering(false);
    }
  }, [diagramCode, zoom]);

  // Re-render when diagram code changes
  useEffect(() => {
    if (diagramCode) {
      renderDiagram();
    }
  }, [diagramCode, renderDiagram]);

  // Update zoom transform
  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.style.transform = `scale(${zoom})`;
    }
  }, [zoom]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.2, 0.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Export functionality adapted for Chrome extension
  const handleExport = useCallback(async (format: 'svg' | 'png') => {
    if (!svgRef.current) {
      toast.error('No diagram to export');
      return;
    }

    try {
      if (format === 'svg') {
        // Export as SVG
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        // Use Chrome extension download API
        if (chrome?.downloads) {
          chrome.downloads.download({
            url,
            filename: `flowmind-diagram-${Date.now()}.svg`,
            saveAs: true
          });
        } else {
          // Fallback for development
          const link = document.createElement('a');
          link.href = url;
          link.download = `flowmind-diagram-${Date.now()}.svg`;
          link.click();
        }
        
        URL.revokeObjectURL(url);
        toast.success('SVG exported successfully');
      } else {
        // Export as PNG using canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              
              if (chrome?.downloads) {
                chrome.downloads.download({
                  url: pngUrl,
                  filename: `flowmind-diagram-${Date.now()}.png`,
                  saveAs: true
                });
              } else {
                // Fallback for development
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = `flowmind-diagram-${Date.now()}.png`;
                link.click();
              }
              
              URL.revokeObjectURL(pngUrl);
              toast.success('PNG exported successfully');
            }
          }, 'image/png');
          
          URL.revokeObjectURL(url);
        };
        
        img.src = url;
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export diagram');
    }
  }, []);

  if (!diagramCode.trim()) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">Enter a description to generate a diagram</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Simplified Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.2}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-gray-200"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center space-x-1">
          {onOptimize && (
            <button
              onClick={onOptimize}
              disabled={isLoading}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Optimize with AI"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleExport('svg')}
            className="p-1 rounded hover:bg-gray-200"
            title="Export as SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Diagram Container */}
      <div className="relative">
        {(isLoading || isRendering) && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">
                {isLoading ? 'Generating...' : 'Rendering...'}
              </span>
            </div>
          </div>
        )}

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Diagram Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {onOptimize && (
                  <button
                    onClick={onOptimize}
                    disabled={isLoading}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
                  >
                    Try AI Fix
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="p-3 overflow-auto max-h-96"
            style={{ 
              minHeight: '200px',
              background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          >
            <div 
              ref={containerRef}
              className="flex justify-center items-start"
              style={{ transformOrigin: 'top left' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramPreview;