"use client";

import React, { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import { useSelector } from "react-redux";
import { Search, X, Youtube } from "lucide-react";
import YouTube from "react-youtube";
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
  Palette,
  Eraser,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
  const { userEmail, userPassword } = useSelector((state) => state.user);
  const canvasRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("pencil");
  const [selectedElement, setSelectedElement] = useState(null);
  const [strokeColor, setStrokeColor] = useState("#FF0000");
  const [fillColor, setFillColor] = useState("");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textSize, setTextSize] = useState(16);
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
  const [pageColor, setPageColor] = useState("");
  const [videoSectionOpen, setVideoSectionOpen] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [videoResults, setVideoResults] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const navigate = useNavigate();

  const email = useSelector((state) => state.user.userEmail);
  const password = useSelector((state) => state.user.userPassword);

  // ********************************************************   API KEYS   ********************************************************

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL; 


  let finalEmail = localStorage.getItem("email") || email;
  let finalPassword = localStorage.getItem("password") || password;

  console.log("Final Email:", finalEmail);
  console.log("Final Password:", finalPassword);

  if(!finalEmail && !finalPassword) { 
    navigate("/");
  }

  const showCanvasAlert = (message, duration = 3000) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(null), duration);
  };

  // YouTube player options
  const playerOptions = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      origin: window.location.origin,
    },
  };

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

  // Resize canvas dynamically
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = videoSectionOpen ? window.innerWidth * 0.75 : window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        redrawCanvas();
      }
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [videoSectionOpen]);

  // Redraw canvas when elements or other dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [elements, panOffset, scale, pageColor, videoSectionOpen, videoResults, selectedVideoId, alertMessage]);

  // Handle video search using YouTube API
  const handleVideoSearch = async (query) => {
    if (!query) return;
    try {
      setIsLoading(true);
      setError(null);
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(
          query
        )}&type=video&safeSearch=strict&key=${apiKey}`
      );
      const data = await response.json();
      if (response.ok) {
        const videos = data.items.map((item) => ({
          id: { videoId: item.id.videoId },
          snippet: {
            title: item.snippet.title,
            thumbnails: {
              medium: { url: item.snippet.thumbnails.medium.url },
            },
          },
        }));
        setVideoResults(videos.slice(0, 50));
      } else {
        throw new Error(data.error?.message || "Failed to fetch videos");
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError("Oops! Couldn't load videos. Try again later.");
      setVideoResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Open YouTube Kids
  const openYouTubeKids = () => {
    window.open("https://www.youtubekids.com/", "_blank");
  };

  // Toggle video section
  const toggleVideoSection = () => {
    setVideoSectionOpen(!videoSectionOpen);
    setVideoSearchQuery("");
    setVideoResults([]);
    setSelectedVideoId(null);
    setError(null);
  };

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
        const textWidth = element.text.length * (element.textSize / 2);
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

  // Create element
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

  // Save drawing to database
  const saveToDatabase = async () => {
    try {
      if (!email) {
        showCanvasAlert("No user email found. Please log in first!");
        return;
      }
      const cleanElements = elements.map(({ roughElement, ...rest }) => rest);
      let url = `http://localhost:3000/api/drawings/${email}`;
      let method = "POST";
      if (drawingId) {
        url = `http://localhost:3000/api/drawings/${drawingId}/${email}`;
        method = "PUT";
      }
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements: cleanElements,
          name: `Drawing-${Date.now()}`,
          userEmail,
          userPassword,
          board: "Board2",
        }),
      });
      const result = await response.json();
      if (response.ok) {
        if (!drawingId) setDrawingId(result.id);
        showCanvasAlert("Yay! Your drawing is saved!");
      } else {
        throw new Error(result.error || "Failed to save drawing");
      }
    } catch (error) {
      console.error("Error saving drawing:", error);
      showCanvasAlert("Oops! Couldn't save your drawing!");
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
    if (tool === "eraser") {
      setAction("erasing");
      if (elementAtPosition) {
        const { element } = elementAtPosition;
        setElements((prev) => prev.filter((el) => el.id !== element.id));
        updateHistory(elements.filter((el) => el.id !== element.id));
      }
      return;
    }
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
    if (action === "erasing" && tool === "eraser") {
      const elementAtPosition = getElementAtPosition(clientX, clientY);
      if (elementAtPosition) {
        const { element } = elementAtPosition;
        setElements((prev) => prev.filter((el) => el.id !== element.id));
      }
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
    } else if (action === "erasing") {
      updateHistory([...elements]);
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

    // Draw elements
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
        context.font = `${element.textSize}px Comic Sans MS`;
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

    // Draw video section on canvas if open
    if (videoSectionOpen) {
      const videoSectionWidth = window.innerWidth * 0.25;
      const videoSectionHeight = window.innerHeight * 0.25;
      const videoSectionX = (window.innerWidth * 0.75) / scale - panOffset.x / scale;
      const videoSectionY = (window.innerHeight - videoSectionHeight) / scale - panOffset.y / scale;

      // Draw background
      context.fillStyle = "rgba(255, 255, 255, 0.95)";
      context.fillRect(videoSectionX, videoSectionY, videoSectionWidth / scale, videoSectionHeight / scale);
      context.strokeStyle = "#FFD700";
      context.lineWidth = 4 / scale;
      context.strokeRect(videoSectionX, videoSectionY, videoSectionWidth / scale, videoSectionHeight / scale);

      // Draw title
      context.font = `${20 / scale}px Comic Sans MS`;
      context.fillStyle = "#6B21A8";
      context.fillText("Fun Videos for Kids!", videoSectionX + 10 / scale, videoSectionY + 30 / scale);
    }

    context.restore();

    // Draw alert message in top-right corner if present
    if (alertMessage) {
      context.save();
      const alertWidth = 300;
      const alertHeight = 100;
      const margin = 20;
      const x = (canvas.width - alertWidth - margin) / scale;
      const y = margin / scale;
      context.fillStyle = "rgba(0, 0, 0, 0.8)";
      context.fillRect(x, y, alertWidth / scale, alertHeight / scale);
      context.fillStyle = "#ffffff";
      context.font = `${24 / scale}px Comic Sans MS`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(alertMessage, x + alertWidth / scale / 2, y + alertHeight / scale / 2);
      context.restore();
    }
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
  const saveAsImage = async (filename) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) return;
    tempContext.fillStyle = pageColor || "white";
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempContext.translate(panOffset.x, panOffset.y);
    tempContext.scale(scale, scale);
    elements.forEach((element) => {
      if (element.type === "pencil") {
        tempContext.beginPath();
        tempContext.moveTo(element.points[0].x, element.points[0].y);
        element.points.forEach((point) => tempContext.lineTo(point.x, point.y));
        tempContext.strokeStyle = element.strokeColor;
        tempContext.lineWidth = element.strokeWidth;
        tempContext.lineCap = "round";
        tempContext.lineJoin = "round";
        tempContext.stroke();
      } else if (element.type === "cartoon" && element.cartoonType) {
        const img = cartoonImages[element.cartoonType];
        if (img) {
          const x = element.points[0].x;
          const y = element.points[0].y;
          const width = element.width || 100;
          const height = element.height || 100;
          tempContext.drawImage(img, x, y, width, height);
        }
      } else if (element.type === "text" && element.text) {
        tempContext.font = `${element.textSize}px Comic Sans MS`;
        tempContext.fillStyle = element.strokeColor;
        tempContext.fillText(element.text, element.points[0].x, element.points[0].y);
      } else if (element.roughElement) {
        roughCanvasRef.current.draw(element.roughElement);
      }
    });
    tempContext.translate(-panOffset.x, -panOffset.y);
    tempContext.scale(1 / scale, 1 / scale);

    const blob = await new Promise((resolve) => {
      tempCanvas.toBlob((blob) => resolve(blob), "image/png");
    });

    const formData = new FormData();
    formData.append("image", blob, "drawing.png");

    try {
      const url = import.meta.env.VITE_NGROK_ENDPOINT || "https://fbd9-34-125-87-16.ngrok-free.app/process";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const img = new Image();
        img.src = `data:image/png;base64,${data.image}`;
        img.onload = () => {
          const newElement = createElement(
            generateId(),
            0,
            0,
            img.width / 2,
            img.height / 2,
            "cartoon",
            null
          );
          newElement.cartoonType = `processed-${Date.now()}`;
          cartoonImages[newElement.cartoonType] = img;
          newElement.width = img.width / 2;
          newElement.height = img.height / 2;
          setElements((prev) => [...prev, newElement]);
          updateHistory([...elements, newElement]);
          showCanvasAlert("Yay! Your image has been processed!");
        };
      } else {
        console.error("Error from server:", data.error);
        showCanvasAlert("Failed to process image!");
      }
    } catch (error) {
      console.error("Network error:", error);
      showCanvasAlert("Network error while processing image!");
    }
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      showCanvasAlert("Couldn't start recording. Please allow microphone access!");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    if (!audioBlob) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const response = await axios.post(GROQ_API_URL, formData, {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const transcription = response.data.text || response.data.transcription;
      if (transcription) {
        const id = generateId();
        const canvas = canvasRef.current;
        const centerX = (canvas.width / 2 - panOffset.x) / scale;
        const centerY = (canvas.height / 2 - panOffset.y) / scale;
        const textElement = createElement(id, centerX, centerY, centerX, centerY, "text", null, transcription);
        setElements((prev) => [...prev, textElement]);
        updateHistory([...elements, textElement]);
        showCanvasAlert("Yay! Your audio has been transcribed!");
      } else {
        throw new Error("No transcription returned");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      showCanvasAlert("Oops! Couldn't transcribe the audio!");
    } finally {
      setIsLoading(false);
      setAudioBlob(null);
    }
  };

  // Magic button options with screenshot
  const handleMagicOption = (option) => {
    const timestamp = Date.now();
    let filename;

    switch (option) {
      case "Make Image":
        filename = `image-${timestamp}.png`;
        saveAsImage(filename);
        break;
      case "Make Video":
        filename = `video-screenshot-${timestamp}.png`;
        break;
      case "Make Animation":
        filename = `animation-screenshot-${timestamp}.png`;
        break;
      case "Audio":
        filename = `audio-screenshot-${timestamp}.png`;
        if (!isRecording) {
          startRecording();
        } else {
          stopRecording();
        }
        break;
      default:
        filename = `screenshot-${timestamp}.png`;
    }

    setMagicMenuOpen(false);
    console.log(`Selected: ${option} - Screenshot saved as ${filename}`);
  };

  // Prevent scroll propagation
  const handleVideoSectionScroll = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: pageColor || "linear-gradient(to bottom right, #bfdbfe, #fbcfe8)",
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 touch-none"
        style={{
          width: videoSectionOpen ? `${window.innerWidth * 0.75}px` : "100%",
          height: "100%",
          cursor: tool === "move" ? "grab" : tool === "eraser" ? "crosshair" : "crosshair",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Toolbar */}
      <div
        className="absolute flex items-center p-4 overflow-x-auto bg-yellow-300 shadow-2xl top-4 rounded-xl"
        style={{
          left: "1rem",
          right: videoSectionOpen ? `${window.innerWidth * 0.25 + 16}px` : "1rem",
        }}
      >
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
          className={`p-3 rounded-full ${tool === "eraser" ? "bg-red-400" : "bg-white"} hover:bg-red-200 shadow-md`}
          onClick={() => setTool("eraser")}
          title="Eraser"
        >
          <Eraser size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Erase</span>
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
        <input
          type="color"
          value={pageColor || "#ffffff"}
          onChange={(e) => setPageColor(e.target.value === "#ffffff" ? "" : e.target.value)}
          className="w-10 h-10 border-2 border-yellow-500 rounded-full shadow-md cursor-pointer"
          title="Page Color"
        />
        <button
          className="p-3 bg-white rounded-full shadow-md hover:bg-gray-200"
          onClick={() => setPageColor("")}
          title="Reset Page Color"
        >
          <Palette size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Reset</span>
        </button>
        <div className="w-1 h-8 mx-2 bg-purple-500 rounded-full" />
        <button
          className={`p-3 rounded-full ${videoSectionOpen ? "bg-teal-400" : "bg-white"} hover:bg-teal-200 shadow-md`}
          onClick={toggleVideoSection}
          title="Videos"
        >
          <Youtube size={28} color="#333" />
          <span className="block text-xs font-bold text-purple-800">Videos</span>
        </button>
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

      {/* Video Section */}
      {videoSectionOpen && (
        <div className="fixed top-0 right-0 z-30 flex flex-col w-1/4 h-screen bg-white shadow-2xl rounded-l-xl">
          {/* Close Button */}
          <button
            className="absolute z-40 p-1 bg-red-400 rounded-full top-2 right-2 hover:bg-red-500"
            onClick={toggleVideoSection}
            title="Close"
          >
            <X size={20} color="#fff" />
          </button>

          {/* Inner content with scroll */}
          <div className="relative flex flex-col flex-1 p-4 overflow-y-auto" onScroll={handleVideoSectionScroll}>
            {/* Search Bar */}
            {!selectedVideoId && (
              <div className="flex items-center mb-4">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleVideoSearch(videoSearchQuery)}
                    placeholder="Search for videos..."
                    className="w-full p-2 pr-10 text-sm text-purple-800 placeholder-purple-400 border-2 border-yellow-400 rounded-full bg-pink-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    className="absolute p-1 bg-purple-500 rounded-full right-2 top-2 hover:bg-purple-600"
                    onClick={() => handleVideoSearch(videoSearchQuery)}
                    title="Search"
                  >
                    <Search size={16} color="#fff" />
                  </button>
                </div>
              </div>
            )}

            {/* Video or Search Results */}
            {selectedVideoId ? (
              <div className="flex flex-col">
                {/* Enlarged YouTube Video */}
                <div className="relative mb-2 h-80">
                  <div className="absolute top-0 left-0 w-full h-full">
                    <YouTube videoId={selectedVideoId} opts={playerOptions} />
                  </div>
                </div>

                {/* Back Button */}
                <button
                  className="w-full px-4 py-1 text-sm font-bold text-white bg-yellow-500 rounded-full shadow-md hover:bg-yellow-600"
                  onClick={() => setSelectedVideoId(null)}
                >
                  Back to Videos
                </button>
              </div>
            ) : (
              <>
                {/* YouTube Kids Button */}
                <button
                  className="w-full px-4 py-1 mb-4 text-sm font-bold text-white bg-red-500 rounded-full shadow-md hover:bg-red-600"
                  onClick={openYouTubeKids}
                >
                  Go to YouTube Kids
                </button>

                {/* Video Results */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-sm font-bold text-center text-purple-800">Loading videos...</p>
                  ) : error ? (
                    <p className="text-sm font-bold text-center text-red-600">{error}</p>
                  ) : videoResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {videoResults.map((video) => (
                        <div
                          key={video.id.videoId}
                          className="p-2 transition-transform bg-yellow-100 rounded-lg shadow-md cursor-pointer hover:scale-105"
                          onClick={() => setSelectedVideoId(video.id.videoId)}
                        >
                          <img
                            src={video.snippet.thumbnails.medium.url}
                            alt={video.snippet.title}
                            className="object-cover w-full h-16 rounded-md"
                          />
                          <h3 className="mt-1 text-xs font-bold text-purple-800 line-clamp-2">
                            {video.snippet.title}
                          </h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-center text-purple-800">
                      Search for videos to see results!
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Magic Button */}
      <div
        className="absolute bottom-10"
        style={{
          right: videoSectionOpen ? `${window.innerWidth * 0.25 + 40}px` : "2.5rem",
        }}
      >
        <button
          className="flex items-center justify-center w-16 h-16 transition rounded-full shadow-xl bg-gradient-to-r from-purple-400 to-pink-400 animate-bounce hover:scale-110"
          onClick={toggleMagicMenu}
          title="Magic Options"
        >
          <span className="text-2xl text-white">✨</span>
        </button>
        {magicMenuOpen && (
          <div className="absolute right-0 p-3 bg-white border-2 border-purple-500 rounded-lg shadow-xl bottom-20">
            <button
              className="block w-full px-4 py-2 font-bold text-purple-800 rounded-md hover:bg-yellow-100"
              onClick={() => handleMagicOption("Make Image")}
            >
              🖼️ Image
            </button>
            <button
              className="block w-full px-4 py-2 font-bold text-purple-800 rounded-md hover:bg-yellow-100"
              onClick={() => handleMagicOption("Make Video")}
            >
              🎥 Video
            </button>
            <button
              className="block w-full px-4 py-2 font-bold text-purple-800 rounded-md hover:bg-yellow-100"
              onClick={() => handleMagicOption("Make Animation")}
            >
              🎬 Animation
            </button>
            <button
              className="block w-full px-4 py-2 font-bold text-purple-800 rounded-md hover:bg-yellow-100"
              onClick={() => handleMagicOption("Audio")}
            >
              {isRecording ? "🎤 Stop Recording" : "🎵 Record Audio"}
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="absolute px-4 py-2 bg-yellow-300 rounded-full shadow-md bottom-4 left-4">
        <span className="text-sm font-bold text-purple-800">Zoom: {Math.round(scale * 100)}%</span>
      </div>

      {/* Recording Animation */}
      {isRecording && (
        <div className="fixed z-50 flex flex-col items-center bottom-28 right-10">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute w-20 h-20 bg-red-200 rounded-full opacity-75 animate-ping"></div>
            <svg
              className="w-12 h-12 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-1.5 4a4.5 4.5 0 019 0V8c0 2.485 2.015 4.5 4.5 4.5h.5a1 1 0 110 2h-.5A6.5 6.5 0 013 8V8a4.5 4.5 0 01-1.5-8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <button
            onClick={stopRecording}
            className="px-4 py-2 mt-4 font-bold text-white transition bg-red-500 rounded-lg hover:bg-red-600"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute w-16 h-16 border-4 border-purple-200 rounded-full"></div>
              <div className="absolute w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-lg font-semibold text-white">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}