"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import {
  Pencil,
  Square,
  Circle,
  Move,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  ImageIcon,
  Minus,
  Plus,
  Type,
} from "lucide-react";

// Cartoon figures data
const cartoonFigures = [
  {
    id: "cartoon-1",
    name: "Cartoon Cat",
    src: "https://th.bing.com/th/id/OIP.DLVD0nvNcdOSWCj9ui22ZwHaGm?w=860&h=767&rs=1&pid=ImgDetMain",
  },
  {
    id: "cartoon-2",
    name: "Cartoon Dog",
    src: "https://static.vecteezy.com/system/resources/previews/022/938/540/non_2x/cute-cat-line-art-for-drawing-free-vector.jpg",
  },
  {
    id: "cartoon-3",
    name: "Cartoon Bird",
    src: "https://th.bing.com/th/id/OIP.CEG8SXa4gpQQSCvK-13wOQHaIg?rs=1&pid=ImgDetMain?height=100&width=100",
  },
];

export default function InfiniteCanvas() {
  const canvasRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("pencil");
  const [selectedElement, setSelectedElement] = useState(null);
  const [strokeColor, setStrokeColor] = useState("#FF0000");
  const [fillColor, setFillColor] = useState("");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textSize, setTextSize] = useState(16); // Default text size
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPanMousePosition, setStartPanMousePosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [cartoonMenuOpen, setCartoonMenuOpen] = useState(false);
  const [selectedCartoon, setSelectedCartoon] = useState(null);
  const [cartoonImages, setCartoonImages] = useState({});
  const [magicMenuOpen, setMagicMenuOpen] = useState(false);
  const [drawingId, setDrawingId] = useState(null);

  // Load cartoon images
  useEffect(() => {
    const images = {};
    cartoonFigures.forEach((figure) => {
      const img = new Image();
      img.src = figure.src;
      img.crossOrigin = "anonymous";
      images[figure.id] = img;
    });
    setCartoonImages(images);
  }, []);

  // Initialize rough canvas
  useEffect(() => {
    if (canvasRef.current) {
      roughCanvasRef.current = new RoughCanvas(canvasRef.current);
    }
  }, []);

  // Resize canvas to fit window
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        redrawCanvas();
      }
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Redraw canvas whenever elements, pan offset, or scale changes
  useEffect(() => {
    redrawCanvas();
  }, [elements, panOffset, scale]);

  // Generate a unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add to history when elements change
  const updateHistory = (newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, [...newElements]]);
    setHistoryIndex(newHistory.length);
  };

  // Undo action
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements([...history[historyIndex - 1]]);
    }
  };

  // Redo action
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements([...history[historyIndex + 1]]);
    }
  };

  // Get element at position
  const getElementAtPosition = (x, y) => {
    const adjustedX = (x - panOffset.x) / scale;
    const adjustedY = (y - panOffset.y) / scale;
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (element.type === "cartoon") {
        const [x1, y1] = [element.points[0].x, element.points[0].y];
        const width = element.width || 100;
        const height = element.height || 100;
        if (adjustedX >= x1 && adjustedX <= x1 + width && adjustedY >= y1 && adjustedY <= y1 + height) {
          return { element, position: "inside" };
        }
      } else if (element.type === "rectangle") {
        const [x1, y1] = [element.points[0].x, element.points[0].y];
        const [x2, y2] = [element.points[1].x, element.points[1].y];
        if (
          adjustedX >= Math.min(x1, x2) &&
          adjustedX <= Math.max(x1, x2) &&
          adjustedY >= Math.min(y1, y2) &&
          adjustedY <= Math.max(y1, y2)
        ) {
          return { element, position: "inside" };
        }
      } else if (element.type === "circle") {
        const [x1, y1] = [element.points[0].x, element.points[0].y];
        const [x2, y2] = [element.points[1].x, element.points[1].y];
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        if (Math.sqrt(Math.pow(adjustedX - x1, 2) + Math.pow(adjustedY - y1, 2)) <= radius) {
          return { element, position: "inside" };
        }
      } else if (element.type === "pencil") {
        for (let i = 0; i < element.points.length - 1; i++) {
          const p1 = element.points[i];
          const p2 = element.points[i + 1];
          const distance = distanceToLineSegment(adjustedX, adjustedY, p1.x, p1.y, p2.x, p2.y);
          if (distance < 10) return { element, position: "inside" };
        }
      } else if (element.type === "text") {
        const [x1, y1] = [element.points[0].x, element.points[0].y];
        const textWidth = element.text.length * (element.textSize / 2); // Rough estimate
        const textHeight = element.textSize;
        if (
          adjustedX >= x1 &&
          adjustedX <= x1 + textWidth &&
          adjustedY >= y1 - textHeight &&
          adjustedY <= y1
        ) {
          return { element, position: "inside" };
        }
      }
    }
    return null;
  };

  const distanceToLineSegment = (x, y, x1, y1, x2, y2) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Create element (including text)
  const createElement = (id, x1, y1, x2, y2, type, cartoonType, text) => {
    const roughOptions = {
      seed: Math.floor(Math.random() * 2000),
      strokeWidth,
      stroke: strokeColor,
      roughness: 1.5,
    };
    if (fillColor) {
      roughOptions.fill = fillColor;
      roughOptions.fillStyle = "solid";
    }
    let roughElement = null;
    if (roughCanvasRef.current && ["rectangle", "circle"].includes(type)) {
      switch (type) {
        case "rectangle":
          roughElement = roughCanvasRef.current.generator.rectangle(x1, y1, x2 - x1, y2 - y1, roughOptions);
          break;
        case "circle":
          const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          roughElement = roughCanvasRef.current.generator.circle(x1, y1, radius * 2, roughOptions);
          break;
      }
    }
    return {
      id,
      type,
      roughElement,
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      strokeColor,
      strokeWidth,
      fillColor,
      cartoonType,
      text: type === "text" ? text : undefined,
      textSize: type === "text" ? textSize : undefined,
      width: type === "cartoon" ? 100 : undefined,
      height: type === "cartoon" ? 100 : undefined,
      seed: roughOptions.seed,
    };
  };

  // Regenerate elements from saved data
  const regenerateElements = (savedElements) => {
    return savedElements.map((el) => {
      if (["rectangle", "circle"].includes(el.type) && roughCanvasRef.current) {
        const roughOptions = {
          seed: el.seed,
          strokeWidth: el.strokeWidth,
          stroke: el.strokeColor,
          roughness: 1.5,
        };
        if (el.fillColor) {
          roughOptions.fill = el.fillColor;
          roughOptions.fillStyle = "solid";
        }
        let roughElement = null;
        if (el.type === "rectangle") {
          roughElement = roughCanvasRef.current.generator.rectangle(
            el.points[0].x,
            el.points[0].y,
            el.points[1].x - el.points[0].x,
            el.points[1].y - el.points[0].y,
            roughOptions
          );
        } else if (el.type === "circle") {
          const radius = Math.sqrt(
            Math.pow(el.points[1].x - el.points[0].x, 2) + Math.pow(el.points[1].y - el.points[0].y, 2)
          );
          roughElement = roughCanvasRef.current.generator.circle(
            el.points[0].x,
            el.points[0].y,
            radius * 2,
            roughOptions
          );
        }
        return { ...el, roughElement };
      }
      return el;
    });
  };

  // Save drawing to database (update if ID exists)
  const saveToDatabase = async () => {
    try {
      const drawingData = 
      {
        elements: elements.map(({ roughElement, ...rest }) => rest),
        name: `Drawing-${Date.now()}`,
      };
      let url = "http://localhost:3000/api/drawings";
      let method = "POST";
      
      if (drawingId) 
      {
        url = `http://localhost:3000/api/drawings/${drawingId}`;
        method = "PUT"; // Use PUT to update existing drawing
      }
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drawingData),
      });
      const result = await response.json();
      if (response.ok) {
        if (!drawingId) setDrawingId(result.id); // Set ID only if new
        alert("Drawing saved successfully!");
      } 
      else 
      {
        throw new Error(result.error || "Failed to save drawing");
      }
    } catch (error) {
      console.error("Error saving drawing:", error);
      alert("Oops! Couldn’t save your drawing.");
    }
  };

  // Load drawing from database
  const loadFromDatabase = async (id = "67f95d1452fbc68703c12ed6") => {
    try {
      const response = await fetch(`http://localhost:3000/api/drawings/${id}`);
      const result = await response.json();
      if (response.ok) {
        const loadedElements = regenerateElements(result.elements);
        setElements(loadedElements);
        setHistory([loadedElements]);
        setHistoryIndex(0);
        setDrawingId(result.id);
        alert("Drawing loaded successfully!");
      } else {
        throw new Error(result.error || "Failed to load drawing");
      }
    } catch (error) {
      console.error("Error loading drawing:", error);
      alert("Oops! Couldn’t load the drawing.");
    }
  };

  // Handle mouse down
  const handleMouseDown = (event) => {
    if (event.button !== 0) return;
    const { clientX, clientY } = event;
    if (tool === "move") {
      setAction("moving");
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }
    const adjustedX = (clientX - panOffset.x) / scale;
    const adjustedY = (clientY - panOffset.y) / scale;
    const elementAtPosition = getElementAtPosition(clientX, clientY);
    if (elementAtPosition) {
      const { element } = elementAtPosition;
      setSelectedElement(element);
      setAction("moving");
      return;
    }
    setAction("drawing");
    if (tool === "pencil") {
      const newElement = {
        id: generateId(),
        type: "pencil",
        points: [{ x: adjustedX, y: adjustedY }],
        strokeColor,
        strokeWidth,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement);
    } else if (tool === "cartoon" && selectedCartoon) {
      const newElement = createElement(
        generateId(),
        adjustedX,
        adjustedY,
        adjustedX + 100,
        adjustedY + 100,
        "cartoon",
        selectedCartoon
      );
      setElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement);
      updateHistory([...elements, newElement]);
    } else if (tool === "text") {
      const text = prompt("Enter your text:");
      if (text) {
        const newElement = createElement(generateId(), adjustedX, adjustedY, adjustedX, adjustedY, "text", null, text);
        setElements((prev) => [...prev, newElement]);
        setSelectedElement(newElement);
        updateHistory([...elements, newElement]);
      }
      setAction("none");
    } else {
      const id = generateId();
      const newElement = createElement(id, adjustedX, adjustedY, adjustedX, adjustedY, tool);
      setElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement);
    }
  };

  // Handle mouse move
  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    const adjustedX = (clientX - panOffset.x) / scale;
    const adjustedY = (clientY - panOffset.y) / scale;
    if (action === "moving" && tool === "move") {
      const dx = clientX - startPanMousePosition.x;
      const dy = clientY - startPanMousePosition.y;
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }
    if (action === "drawing" && selectedElement) {
      if (selectedElement.type === "pencil") {
        const newPoints = [...selectedElement.points, { x: adjustedX, y: adjustedY }];
        const updatedElement = { ...selectedElement, points: newPoints };
        setElements((prev) => prev.map((el) => (el.id === selectedElement.id ? updatedElement : el)));
        setSelectedElement(updatedElement);
      } else if (["rectangle", "circle"].includes(selectedElement.type)) {
        const { id, type, points } = selectedElement;
        const updatedElement = createElement(id, points[0].x, points[0].y, adjustedX, adjustedY, type);
        setElements((prev) => prev.map((el) => (el.id === selectedElement.id ? updatedElement : el)));
        setSelectedElement(updatedElement);
      }
    } else if (action === "moving" && selectedElement) {
      if (selectedElement.type === "pencil") {
        const dx = adjustedX - selectedElement.points[0].x;
        const dy = adjustedY - selectedElement.points[0].y;
        const newPoints = selectedElement.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        }));
        const updatedElement = { ...selectedElement, points: newPoints };
        setElements((prev) => prev.map((el) => (el.id === selectedElement.id ? updatedElement : el)));
        setSelectedElement(updatedElement);
      } else if (["rectangle", "circle", "cartoon", "text"].includes(selectedElement.type)) {
        const dx = adjustedX - selectedElement.points[0].x;
        const dy = adjustedY - selectedElement.points[0].y;
        let updatedElement;
        if (selectedElement.type === "cartoon") {
          updatedElement = {
            ...selectedElement,
            points: [
              { x: adjustedX, y: adjustedY },
              { x: adjustedX + (selectedElement.width || 100), y: adjustedY + (selectedElement.height || 100) },
            ],
          };
        } else if (selectedElement.type === "text") {
          updatedElement = {
            ...selectedElement,
            points: [{ x: adjustedX, y: adjustedY }, { x: adjustedX, y: adjustedY }],
          };
        } else {
          const width = selectedElement.points[1].x - selectedElement.points[0].x;
          const height = selectedElement.points[1].y - selectedElement.points[0].y;
          updatedElement = createElement(
            selectedElement.id,
            adjustedX,
            adjustedY,
            adjustedX + width,
            adjustedY + height,
            selectedElement.type
          );
        }
        setElements((prev) => prev.map((el) => (el.id === selectedElement.id ? updatedElement : el)));
        setSelectedElement(updatedElement);
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (action === "drawing" || action === "moving") {
      if (selectedElement) updateHistory([...elements]);
    }
    setAction("none");
    setSelectedElement(null);
  };

  // Handle touch events
  const handleTouchStart = (event) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
    }
  };
  const handleTouchMove = (event) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
  };
  const handleTouchEnd = () => handleMouseUp();

  // Redraw the canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context || !roughCanvasRef.current) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(panOffset.x, panOffset.y);
    context.scale(scale, scale);
    elements.forEach((element) => {
      context.globalAlpha = 1;
      if (element.type === "pencil") {
        context.beginPath();
        context.moveTo(element.points[0].x, element.points[0].y);
        element.points.forEach((point) => context.lineTo(point.x, point.y));
        context.strokeStyle = element.strokeColor;
        context.lineWidth = element.strokeWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();
      } else if (element.type === "cartoon" && element.cartoonType) {
        const img = cartoonImages[element.cartoonType];
        if (img) {
          const x = element.points[0].x;
          const y = element.points[0].y;
          const width = element.width || 100;
          const height = element.height || 100;
          context.drawImage(img, x, y, width, height);
          if (selectedElement && selectedElement.id === element.id) {
            context.strokeStyle = "#FFD700";
            context.lineWidth = 3;
            context.strokeRect(x, y, width, height);
          }
        }
      } else if (element.type === "text" && element.text) {
        context.font = `${element.textSize}px Comic Sans MS`; // Fun font for kids
        context.fillStyle = element.strokeColor;
        context.fillText(element.text, element.points[0].x, element.points[0].y);
        if (selectedElement && selectedElement.id === element.id) {
          context.strokeStyle = "#FFD700";
          context.lineWidth = 3;
          context.strokeRect(
            element.points[0].x,
            element.points[0].y - element.textSize,
            element.text.length * (element.textSize / 2),
            element.textSize
          );
        }
      } else if (element.roughElement) {
        roughCanvasRef.current.draw(element.roughElement);
      }
    });
    context.restore();
  };

  // Zoom in
  const zoomIn = () => setScale((prevScale) => Math.min(prevScale * 1.2, 5));

  // Zoom out
  const zoomOut = () => setScale((prevScale) => Math.max(prevScale / 1.2, 0.1));

  // Reset zoom and pan
  const resetView = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Clear canvas
  const clearCanvas = () => {
    setElements([]);
    updateHistory([]);
    setDrawingId(null);
  };

  // Save canvas as image
  const saveAsImage = (filename) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) return;
    tempContext.fillStyle = "white";
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempContext.drawImage(canvas, 0, 0);
    const link = document.createElement("a");
    link.download = filename || "infinite-canvas-drawing.png";
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  };

  // Increase stroke width
  const increaseStrokeWidth = () => setStrokeWidth((prev) => Math.min(prev + 1, 10));

  // Decrease stroke width
  const decreaseStrokeWidth = () => setStrokeWidth((prev) => Math.max(prev - 1, 1));

  // Increase text size
  const increaseTextSize = () => setTextSize((prev) => Math.min(prev + 2, 50));

  // Decrease text size
  const decreaseTextSize = () => setTextSize((prev) => Math.max(prev - 2, 10));

  // Toggle cartoon menu
  const toggleCartoonMenu = () => setCartoonMenuOpen(!cartoonMenuOpen);

  // Select cartoon
  const selectCartoon = (cartoonId) => {
    setSelectedCartoon(cartoonId);
    setTool("cartoon");
    setCartoonMenuOpen(false);
  };

  // Toggle magic menu
  const toggleMagicMenu = () => setMagicMenuOpen(!magicMenuOpen);

  // Magic button options with screenshot
  const handleMagicOption = (option) => {
    const timestamp = Date.now();
    let filename;
    switch (option) {
      case "Make Image":
        filename = `image-${timestamp}.png`;
        break;
      case "Make Video":
        filename = `video-screenshot-${timestamp}.png`;
        break;
      case "Make Animation":
        filename = `animation-screenshot-${timestamp}.png`;
        break;
      case "Audio":
        filename = `audio-screenshot-${timestamp}.png`;
        break;
      default:
        filename = `screenshot-${timestamp}.png`;
    }
    saveAsImage(filename);
    setMagicMenuOpen(false);
    console.log(`Selected: ${option} - Screenshot saved as ${filename}`);
    // Add further logic here for video, animation, audio if needed
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-blue-200 to-pink-200">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: tool === "move" ? "grab" : "crosshair" }}
      />

      {/* Toolbar */}
      <div className="absolute flex items-center p-4 space-x-4 transform -translate-x-1/2 bg-yellow-300 shadow-2xl top-4 left-1/2 rounded-xl">
        <button
          className={`p-3 rounded-full ${tool === "pencil" ? "bg-green-400" : "bg-white"} hover:bg-green-200 shadow-md`}
          onClick={() => setTool("pencil")}
          title="Pencil"
        >
          <Pencil size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Draw</span>
        </button>
        <button
          className={`p-3 rounded-full ${tool === "rectangle" ? "bg-purple-400" : "bg-white"} hover:bg-purple-200 shadow-md`}
          onClick={() => setTool("rectangle")}
          title="Rectangle"
        >
          <Square size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Square</span>
        </button>
        <button
          className={`p-3 rounded-full ${tool === "circle" ? "bg-blue-400" : "bg-white"} hover:bg-blue-200 shadow-md`}
          onClick={() => setTool("circle")}
          title="Circle"
        >
          <Circle size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Circle</span>
        </button>
        <button
          className={`p-3 rounded-full ${tool === "cartoon" ? "bg-pink-400" : "bg-white"} hover:bg-pink-200 shadow-md`}
          onClick={toggleCartoonMenu}
          title="Cartoon Figures"
        >
          <ImageIcon size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Stickers</span>
        </button>
        <button
          className={`p-3 rounded-full ${tool === "text" ? "bg-yellow-400" : "bg-white"} hover:bg-yellow-200 shadow-md`}
          onClick={() => setTool("text")}
          title="Text"
        >
          <Type size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Text</span>
        </button>
        <button
          className={`p-3 rounded-full ${tool === "move" ? "bg-orange-400" : "bg-white"} hover:bg-orange-200 shadow-md`}
          onClick={() => setTool("move")}
          title="Pan Canvas"
        >
          <Move size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Move</span>
        </button>

        <div className="w-1 h-8 mx-2 bg-purple-500 rounded-full" />

        <div className="flex items-center p-2 space-x-2 bg-white rounded-lg shadow-md">
          <button
            className="p-2 bg-blue-300 rounded-full hover:bg-blue-400"
            onClick={decreaseStrokeWidth}
            title="Decrease Stroke Width"
          >
            <Minus size={20} color="#fff" />
          </button>
          <span className="w-6 text-lg font-bold text-center text-purple-800">{strokeWidth}</span>
          <button
            className="p-2 bg-blue-300 rounded-full hover:bg-blue-400"
            onClick={increaseStrokeWidth}
            title="Increase Stroke Width"
          >
            <Plus size={20} color="#fff" />
          </button>
          <span className="ml-2 text-xs font-bold text-purple-800">Size</span>
        </div>

        <div className="flex items-center p-2 space-x-2 bg-white rounded-lg shadow-md">
          <button
            className="p-2 bg-blue-300 rounded-full hover:bg-blue-400"
            onClick={decreaseTextSize}
            title="Decrease Text Size"
          >
            <Minus size={20} color="#fff" />
          </button>
          <span className="w-6 text-lg font-bold text-center text-purple-800">{textSize}</span>
          <button
            className="p-2 bg-blue-300 rounded-full hover:bg-blue-400"
            onClick={increaseTextSize}
            title="Increase Text Size"
          >
            <Plus size={20} color="#fff" />
          </button>
          <span className="ml-2 text-xs font-bold text-purple-800">Text Size</span>
        </div>

        <div className="w-1 h-8 mx-2 bg-purple-500 rounded-full" />

        <input
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="w-10 h-10 border-2 border-yellow-500 rounded-full shadow-md cursor-pointer"
          title="Stroke Color"
        />
        <input
          type="color"
          value={fillColor || "#ffffff"}
          onChange={(e) => setFillColor(e.target.value === "#ffffff" ? "" : e.target.value)}
          className="w-10 h-10 border-2 border-yellow-500 rounded-full shadow-md cursor-pointer"
          title="Fill Color"
        />

        <div className="w-1 h-8 mx-2 bg-purple-500 rounded-full" />

        <button
          className="p-3 bg-white rounded-full shadow-md hover:bg-gray-200"
          onClick={undo}
          title="Undo"
          disabled={historyIndex <= 0}
        >
          <Undo size={28} color={historyIndex <= 0 ? "#ccc" : "#333"} />
          <span className="block text-xs font-bold text-purple-800">Undo</span>
        </button>
        <button
          className="p-3 bg-white rounded-full shadow-md hover:bg-gray-200"
          onClick={redo}
          title="Redo"
          disabled={historyIndex >= history.length - 1}
        >
          <Redo size={28} color={historyIndex >= history.length - 1 ? "#ccc" : "#333"} />
          <span className="block text-xs font-bold text-purple-800">Redo</span>
        </button>

        <div className="w-1 h-8 mx-2 bg-purple-500 rounded-full" />

        <button
          className="p-3 bg-white rounded-full shadow-md hover:bg-green-200"
          onClick={zoomIn}
          title="Zoom In"
        >
          <ZoomIn size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Zoom In</span>
        </button>
        <button
          className="p-3 bg-white rounded-full shadow-md hover:bg-green-200"
          onClick={zoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Zoom Out</span>
        </button>
        <button
          className="p-3 bg-white rounded-full shadow-md hover:bg-green-200"
          onClick={resetView}
          title="Reset View"
        >
          <span className="text-sm font-bold text-purple-800">Reset</span>
        </button>

        <div className="w-1 h-8 mx-2 bg-purple-500 rounded-full" />

        <button
          className="p-3 bg-red-400 rounded-full shadow-md hover:bg-red-500"
          onClick={clearCanvas}
          title="Clear Canvas"
        >
          <Trash2 size={28} color="#fff" />
          <span className="block text-xs font-bold text-white">Clear</span>
        </button>
        <button
          className="p-3 bg-green-400 rounded-full shadow-md hover:bg-green-500"
          onClick={saveToDatabase}
          title="Save to Database"
        >
          <Download size={28} color="#fff" />
          <span className="block text-xs font-bold text-white">Save</span>
        </button>
        <button
          className="p-3 bg-blue-400 rounded-full shadow-md hover:bg-blue-500"
          onClick={() => loadFromDatabase("67f95d1452fbc68703c12ed6")}
          title="Load from Database"
        >
          <span className="text-sm font-bold text-white">Load</span>
        </button>
      </div>

      {/* Cartoon Menu */}
      {cartoonMenuOpen && (
        <div className="absolute p-4 transform -translate-x-1/2 bg-pink-100 border-2 border-yellow-400 shadow-2xl top-20 left-1/2 rounded-xl">
          <h3 className="mb-3 text-lg font-bold text-purple-800">Pick a Sticker!</h3>
          <div className="grid grid-cols-3 gap-3">
            {cartoonFigures.map((figure) => (
              <div
                key={figure.id}
                className={`p-2 cursor-pointer rounded-lg hover:bg-yellow-200 ${
                  selectedCartoon === figure.id ? "bg-yellow-300" : "bg-white"
                } shadow-md`}
                onClick={() => selectCartoon(figure.id)}
              >
                <img src={figure.src || "/placeholder.svg"} alt={figure.name} className="object-contain w-20 h-20" />
                <p className="mt-1 text-sm font-bold text-center text-purple-800">{figure.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Magic Button */}
      <div className="absolute bottom-10 right-10">
        <button
          className="flex items-center justify-center w-16 h-16 transition-transform rounded-full shadow-xl bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce hover:scale-110"
          onClick={toggleMagicMenu}
          title="Magic Options"
        >
          <span className="text-2xl text-white">✨</span>
        </button>
        {magicMenuOpen && (
          <div className="absolute right-0 p-3 bg-white border-2 border-yellow-400 rounded-lg shadow-2xl bottom-20">
            <button
              className="block w-full px-4 py-2 font-bold text-left text-purple-800 rounded-md hover:bg-yellow-200"
              onClick={() => handleMagicOption("Make Image")}
            >
              🖼️ Image
            </button>
            <button
              className="block w-full px-4 py-2 font-bold text-left text-purple-800 rounded-md hover:bg-yellow-200"
              onClick={() => handleMagicOption("Make Video")}
            >
              🎥 Video
            </button>
            <button
              className="block w-full px-4 py-2 font-bold text-left text-purple-800 rounded-md hover:bg-yellow-200"
              onClick={() => handleMagicOption("Make Animation")}
            >
              🎬 Animation
            </button>
            <button
              className="block w-full px-4 py-2 font-bold text-left text-purple-800 rounded-md hover:bg-yellow-200"
              onClick={() => handleMagicOption("Audio")}
            >
              🎵 Audio
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="absolute px-4 py-2 bg-yellow-300 rounded-full shadow-md bottom-4 left-4">
        <span className="text-sm font-bold text-purple-800">Zoom: {Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
}