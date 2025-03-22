import React, { useState, useRef, useEffect } from 'react';
import { TrashIcon, ArrowDownTrayIcon, PencilIcon } from '@heroicons/react/24/outline';

interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

type DrawingAction = Point[];

// Define tool types
type ToolType = 'pen' | 'eraser';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [drawingActions, setDrawingActions] = useState<DrawingAction[]>([]);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [mouseDownTime, setMouseDownTime] = useState<number>(0);
  const [mouseIsDown, setMouseIsDown] = useState<boolean>(false);
  const [initialClickPos, setInitialClickPos] = useState<Point | null>(null);
  const [dragThreshold] = useState<number>(5); // pixels to move before considering it a drag
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [eraserSize, setEraserSize] = useState<number>(20);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to full viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    setContext(ctx);
    
    // Handle window resize
    const handleResize = (): void => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas(ctx);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw everything when needed
  const redrawCanvas = (ctx: CanvasRenderingContext2D): void => {
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Redraw all stored paths with smooth curves
    drawingActions.forEach(path => {
      drawPath(ctx, path);
    });
    
    // Draw current path if drawing
    if (isDrawing && currentPath.length >= 2) {
      drawPath(ctx, currentPath);
    }
    
    // Redraw all text elements
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000000';
    textElements.forEach(text => {
      if (text.id !== activeTextId || !isTyping) {
        ctx.fillText(text.content, text.x, text.y);
      }
    });
    
    // Draw active text if typing
    const activeText = textElements.find(t => t.id === activeTextId);
    if (activeText && isTyping) {
      ctx.fillText(activeText.content, activeText.x, activeText.y);
      
      // Draw cursor
      const textWidth = ctx.measureText(activeText.content).width;
      const cursorX = activeText.x + textWidth;
      
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(cursorX, activeText.y - 14);
        ctx.lineTo(cursorX, activeText.y + 2);
        ctx.stroke();
      }
    }

    // Draw eraser preview if eraser is active and mouse is down
    if (activeTool === 'eraser' && mouseIsDown && lastPoint) {
      ctx.beginPath();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.arc(lastPoint.x, lastPoint.y, eraserSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // Helper function to draw a path with smooth curves
  const drawPath = (ctx: CanvasRenderingContext2D, path: Point[]): void => {
    if (!ctx || path.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length - 2; i++) {
      const xc = (path[i].x + path[i + 1].x) / 2;
      const yc = (path[i].y + path[i + 1].y) / 2;
      const speed = Math.sqrt(
        Math.pow(path[i + 1].x - path[i].x, 2) + 
        Math.pow(path[i + 1].y - path[i].y, 2)
      );
      ctx.lineWidth = Math.max(1, 4 - speed * 0.1);
      ctx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
    }
    
    // For the last two points
    if (path.length > 2) {
      const lastIndex = path.length - 2;
      ctx.quadraticCurveTo(
        path[lastIndex].x,
        path[lastIndex].y,
        path[lastIndex + 1].x,
        path[lastIndex + 1].y
      );
    } else {
      ctx.lineTo(path[1].x, path[1].y);
    }
    
    ctx.stroke();
  };

  // Use effect to redraw canvas when data changes
  useEffect(() => {
    if (context) {
      redrawCanvas(context);
    }
  }, [context, textElements, drawingActions, isTyping, activeTextId, activeTool, mouseIsDown, lastPoint, currentPath, isDrawing]);

  // Add cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (isTyping && context) {
        redrawCanvas(context);
      }
    }, 500);
    
    return () => clearInterval(blinkInterval);
  }, [isTyping, textElements, drawingActions, context]);

  // Create new text element at specified position
  const createTextAtPosition = (x: number, y: number): string => {
    const newTextId = Date.now().toString();
    const newText: TextElement = {
      id: newTextId,
      content: '',
      x,
      y
    };
    
    setTextElements([...textElements, newText]);
    setActiveTextId(newTextId);
    setIsTyping(true);
    setIsDrawing(false);
    return newTextId;
  };

  // Finalize current text (when exiting typing mode)
  const finalizeCurrentText = (): void => {
    if (!isTyping) return;
    
    const activeText = textElements.find(t => t.id === activeTextId);
    if (activeText && activeText.content.length === 0) {
      // Remove empty text elements
      setTextElements(textElements.filter(t => t.id !== activeTextId));
    }
    setIsTyping(false);
    setActiveTextId(null);
  };

  // Check if eraser intersects with a drawing path
  const checkEraserIntersection = (eraserX: number, eraserY: number): { actionIndex: number, pointIndices: number[] }[] => {
    const intersections: { actionIndex: number, pointIndices: number[] }[] = [];
    
    drawingActions.forEach((path, actionIndex) => {
      const pointIndices: number[] = [];
      
      path.forEach((point, pointIndex) => {
        const distance = Math.sqrt(
          Math.pow(point.x - eraserX, 2) + 
          Math.pow(point.y - eraserY, 2)
        );
        
        if (distance <= eraserSize / 2) {
          pointIndices.push(pointIndex);
        }
      });
      
      if (pointIndices.length > 0) {
        intersections.push({ actionIndex, pointIndices });
      }
    });
    
    return intersections;
  };

  // Apply eraser to delete drawing points
  const applyEraser = (eraserX: number, eraserY: number): void => {
    const intersections = checkEraserIntersection(eraserX, eraserY);
    
    if (intersections.length === 0) return;
    
    // Create a new array of drawing actions, removing intersected points
    const newDrawingActions = [...drawingActions];
    
    // Process intersections in reverse order to avoid index issues
    intersections.reverse().forEach(({ actionIndex, pointIndices }) => {
      if (pointIndices.length === newDrawingActions[actionIndex].length) {
        // If all points in the path are intersected, remove the entire path
        newDrawingActions.splice(actionIndex, 1);
      } else if (pointIndices.length === 1) {
        // If only one point is intersected, check if it splits the path
        const pointIndex = pointIndices[0];
        
        if (pointIndex === 0 || pointIndex === newDrawingActions[actionIndex].length - 1) {
          // If it's the first or last point, just remove that point
          newDrawingActions[actionIndex] = newDrawingActions[actionIndex].filter((_, i) => i !== pointIndex);
        } else {
          // If it's in the middle, split the path into two
          const pathBefore = newDrawingActions[actionIndex].slice(0, pointIndex);
          const pathAfter = newDrawingActions[actionIndex].slice(pointIndex + 1);
          
          // Replace the current path with the first part
          newDrawingActions[actionIndex] = pathBefore;
          
          // Add the second part as a new path if it has at least 2 points
          if (pathAfter.length >= 2) {
            newDrawingActions.push(pathAfter);
          }
        }
      } else {
        // If multiple points are intersected, we need to handle more complex splitting
        // Sort point indices in descending order to avoid index issues when removing
        pointIndices.sort((a, b) => b - a);
        
        // Create a new path without the intersected points
        const newPath = [...newDrawingActions[actionIndex]];
        pointIndices.forEach(index => {
          newPath.splice(index, 1);
        });
        
        // If the path still has enough points, keep it
        if (newPath.length >= 2) {
          newDrawingActions[actionIndex] = newPath;
        } else {
          // Otherwise, remove the entire path
          newDrawingActions.splice(actionIndex, 1);
        }
      }
    });
    
    setDrawingActions(newDrawingActions);
  };

  // Handle mouse events for drawing and text positioning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMouseIsDown(true);
    setMouseDownTime(Date.now());
    setLastPoint({ x, y });
    setInitialClickPos({ x, y });
    
    if (activeTool === 'eraser') {
      applyEraser(x, y);
      return;
    }
    
    // Check if clicked on existing text
    const clickedTextIndex = textElements.findIndex(text => {
      if (!context) return false;
      const textWidth = context.measureText(text.content).width;
      return (
        x >= text.x && 
        x <= text.x + textWidth && 
        y >= text.y - 16 && 
        y <= text.y
      );
    });
    
    if (clickedTextIndex !== -1) {
      // Switch to editing existing text
      setIsTyping(true);
      setIsDrawing(false);
      setActiveTextId(textElements[clickedTextIndex].id);
    } else if (isTyping) {
      // If we're already typing, create a new text element at click position
      // First end current text editing
      finalizeCurrentText();
      
      // Create new text at clicked position
      createTextAtPosition(x, y);
    } else {
      // Prepare for potential drawing
      setCurrentPath([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!mouseIsDown || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If eraser tool is active, apply eraser at current position
    if (activeTool === 'eraser') {
      applyEraser(x, y);
      setLastPoint({ x, y });
      return;
    }
    
    // Detect if we've moved enough to consider it a drag
    if (initialClickPos && 
        (Math.abs(x - initialClickPos.x) > dragThreshold || 
         Math.abs(y - initialClickPos.y) > dragThreshold)) {
         
      // If we're typing, switch to drawing mode
      if (isTyping) {
        finalizeCurrentText();
        setIsDrawing(true);
        setCurrentPath([initialClickPos, { x, y }]);
      }
      // If we're not drawing yet, start drawing mode
      else if (!isDrawing) {
        setIsDrawing(true);
      }
    }
    
    if (isDrawing) {
      // Update current path - this will trigger a redraw
      setCurrentPath(prevPath => [...prevPath, { x, y }]);
    }
    
    setLastPoint({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current) return;
    
    const wasDrawing = isDrawing;
    
    // If it was a click (not a drag) and we're not already typing
    if (!wasDrawing && !isTyping && 
        Date.now() - mouseDownTime < 200 && // Short click
        activeTool === 'pen') { // Only create text in pen mode
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Start typing at this position
      createTextAtPosition(x, y);
    }
    
    // If we were drawing, save the path
    if (wasDrawing && currentPath.length > 1) {
      setDrawingActions(prevActions => [...prevActions, currentPath]);
      setCurrentPath([]);
    }
    
    setMouseIsDown(false);
    setIsDrawing(false);
    setInitialClickPos(null);
  };

  // Handle keyboard events for typing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>): void => {
    // Find active text element
    const activeTextIndex = textElements.findIndex(t => t.id === activeTextId);
    if (activeTextIndex === -1) return;
    
    const updatedTextElements = [...textElements];
    const textEl = {...updatedTextElements[activeTextIndex]};
    
    // Handle regular typing
    if (e.key.length === 1) {
      if (!isTyping) {
        setIsTyping(true);
        setIsDrawing(false);
      }
      
      textEl.content += e.key;
      updatedTextElements[activeTextIndex] = textEl;
      setTextElements(updatedTextElements);
    } 
    // Handle special keys
    else if (e.key === 'Backspace') {
      if (textEl.content.length > 0) {
        textEl.content = textEl.content.slice(0, -1);
        updatedTextElements[activeTextIndex] = textEl;
        setTextElements(updatedTextElements);
      }
    } 
    else if (e.key === 'Enter') {
      // Create new text element below current one
      const newTextId = Date.now().toString();
      const newText: TextElement = {
        id: newTextId,
        content: '',
        x: textEl.x,
        y: textEl.y + 24
      };
      
      setTextElements([...updatedTextElements, newText]);
      setActiveTextId(newTextId);
    } 
    else if (e.key === 'Escape') {
      // Exit typing mode
      finalizeCurrentText();
    }
  };

  // Auto-exit typing mode after inactivity
  useEffect(() => {
    let inactivityTimer: number;
    
    if (isTyping) {
      inactivityTimer = setTimeout(() => {
        finalizeCurrentText();
      }, 3000);
    }
    
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [isTyping, textElements, activeTextId]);

  // Handle download canvas as PNG
  const handleDownloadCanvas = (): void => {
    if (!canvasRef.current) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.download = 'canvas-drawing.png';
    
    // Convert canvas to data URL
    link.href = canvasRef.current.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-white relative">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${activeTool === 'eraser' ? 'cursor-default' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing && currentPath.length > 1) {
            setDrawingActions(prevActions => [...prevActions, currentPath]);
          }
          setMouseIsDown(false);
          setIsDrawing(false);
          setCurrentPath([]);
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      />
      
      {/* Vertical Toolbar */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
        <button 
          className={`p-2 rounded-lg transition-colors ${activeTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          onClick={() => setActiveTool('pen')}
          title="Pen Tool"
        >
          <PencilIcon className="w-6 h-6" />
        </button>
        
        <button 
          className={`p-2 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          onClick={() => setActiveTool('eraser')}
          title="Eraser Tool"
        >
          <TrashIcon className="w-6 h-6" />
        </button>
        
        <div className="border-t border-gray-200 my-1"></div>
        
        <button 
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={handleDownloadCanvas}
          title="Download as PNG"
        >
          <ArrowDownTrayIcon className="w-6 h-6" />
        </button>
      </div>
      
      <div className="fixed bottom-4 left-4 text-sm text-gray-500">
        {isTyping ? 'Typing Mode' : isDrawing ? 'Drawing Mode' : activeTool === 'eraser' ? 'Eraser Mode' : 'Ready'}
      </div>
    </div>
  );
};

export default App;