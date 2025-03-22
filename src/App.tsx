import React, { useState, useRef, useEffect } from 'react';

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
    
    // Redraw all paths with smooth curves
    drawingActions.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (path.length >= 2) {
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
      }
      
      ctx.stroke();
    });
    
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
  };

  // Use effect to redraw canvas when data changes
  useEffect(() => {
    if (context) {
      redrawCanvas(context);
    }
  }, [context, textElements, drawingActions, isTyping, activeTextId]);

  // Add cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (isTyping && context) {
        redrawCanvas(context);
      }
    }, 500);
    
    return () => clearInterval(blinkInterval);
  }, [isTyping, textElements, drawingActions]);

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
    
    if (isDrawing && context && lastPoint) {
      // Calculate drawing speed for line width variation
      const speed = Math.sqrt(
        Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
      );
      const lineWidth = Math.max(1, 4 - speed * 0.1);

      // Smooth the line using quadratic curves
      context.beginPath();
      if (currentPath.length >= 2) {
        const lastTwoPoints = currentPath.slice(-2);
        const xc = (lastTwoPoints[1].x + x) / 2;
        const yc = (lastTwoPoints[1].y + y) / 2;
        
        context.moveTo(lastTwoPoints[0].x, lastTwoPoints[0].y);
        context.quadraticCurveTo(lastTwoPoints[1].x, lastTwoPoints[1].y, xc, yc);
      } else {
        context.moveTo(lastPoint.x, lastPoint.y);
        context.lineTo(x, y);
      }
      
      context.strokeStyle = '#000000';
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke();
      
      // Update current path
      setCurrentPath([...currentPath, { x, y }]);
    }
    
    setLastPoint({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current) return;
    
    const wasDrawing = isDrawing;
    
    // If it was a click (not a drag) and we're not already typing
    if (!wasDrawing && !isTyping && 
        Date.now() - mouseDownTime < 200) { // Short click
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Start typing at this position
      createTextAtPosition(x, y);
    }
    
    // If we were drawing, save the path
    if (wasDrawing && currentPath.length > 1) {
      setDrawingActions([...drawingActions, currentPath]);
    }
    
    setMouseIsDown(false);
    setIsDrawing(false);
    setCurrentPath([]);
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

  return (
    <div className="w-full h-screen overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing && currentPath.length > 1) {
            setDrawingActions([...drawingActions, currentPath]);
          }
          setMouseIsDown(false);
          setIsDrawing(false);
          setCurrentPath([]);
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      />
      <div className="fixed bottom-4 left-4 text-sm text-gray-500">
        {isTyping ? 'Typing Mode' : isDrawing ? 'Drawing Mode' : 'Ready'}
      </div>
    </div>
  );
};

export default App;