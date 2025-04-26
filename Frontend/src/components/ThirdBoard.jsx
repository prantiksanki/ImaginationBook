"use client"

import { useEffect, useRef, useState } from "react"
import { RoughCanvas } from "roughjs/bin/canvas"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import YouTube from "react-youtube"
import { Pencil, Square, Circle, Move, Trash2, Download, ZoomIn, ZoomOut, Undo, Redo, ImageIcon, Minus, Plus, Type, Palette, Eraser, Search, X, Youtube } from 'lucide-react'
import cartoon1 from '../assets/cartoon-1.png';
import cartoon2 from '../assets/cartoon-2.jpg';
import cartoon4 from '../assets/cartoon-4.jpg';
import cartoon5 from '../assets/cartoon-5.jpg';
import magic1 from '../assets/magic-1.png';
import magic2 from '../assets/magic-2.png';
import magic3 from '../assets/magic-3.png';
import sticker1 from "../assets/sticker-1.jpg"; 
import sticker2 from "../assets/sticker-2.png"; 
import sticker3 from "../assets/sticker-3.jpg"; 
// import sticker4 from "../assets/sticker-4.jpg"; 
import sticker5 from "../assets/sticker-5.jpg"; 
import sticker6 from "../assets/sticker-6.jpg"; 
import sticker7 from "../assets/sticker-7.jpg"; 
// Cartoon figures data
const cartoonFigures = [
  {
    id: "cartoon-1",
    name: "Cartoon Cat",
    src: sticker1,
  },
  {
    id: "cartoon-2",
    name: "Cartoon Dog",
    src: sticker2,
  },
  {
    id: "cartoon-3",
    name: "Cartoon Bird",
    src: sticker3,
  },
  {
    id: "cartoon-4",
    name: "Cartoon Fish",
    src: sticker5,
  },
  {
    id: "cartoon-5",
    name: "Cartoon Rabbit",
    src: sticker6,
  },
  {
    id: "cartoon-6",
    name: "Cartoon Elephant",
    src: sticker7,
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
  const [isAnimationOpen, setIsAnimationOpen] = useState(false);
  const [animations, setAnimations] = useState([]);
  const animationFrameRef = useRef(null);

  const email = useSelector((state) => state.user.userEmail);
  const password = useSelector((state) => state.user.userPassword);


  // *********************************** API KEYS ***********************************
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY 
  const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL
  const BASE_URL = import.meta.env.VITE_BASE_URL

  // if (!email && !password) {
  //   navigate("/");
  // }


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
    height: "240",
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
      setError("Oops! Can't find videos right now!");
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
      if (!finalEmail) {
        showCanvasAlert("No user email found. Please log in first!");
        return;
      }

      const drawingData = {
        elements: elements.map(({ roughElement, ...rest }) => rest),
        name: `KidsDrawing-${Date.now()}`,
        board: "Board1",
      };
      let url = `${BASE_URL}/api/drawings/${finalEmail}`;
      let method = "POST";
      if (drawingId) {
        url = `${BASE_URL}/api/drawings/${drawingId}/${finalEmail}`;
        method = "PUT";
      }
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drawingData),
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
      const text = prompt("Type something fun!");
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

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Fill background
    context.fillStyle = pageColor || "white";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Save context state
    context.save();
    context.translate(panOffset.x, panOffset.y);
    context.scale(scale, scale);

    // Draw animations
    animations.forEach((anim) => {
      if (!anim.image) return;
      
      context.save();
      const now = Date.now();
      const progress = ((now - anim.startTime) % anim.duration) / anim.duration;
      
      // Set opacity for animations
      context.globalAlpha = 0.5;
      
      // Apply different animations based on type
      switch (anim.animationType) {
        case "rotate":
          context.translate(anim.x + anim.width/2, anim.y + anim.height/2);
          context.rotate(progress * Math.PI * 2);
          context.translate(-(anim.x + anim.width/2), -(anim.y + anim.height/2));
          break;
          
        case "bounce":
          const bounceOffset = Math.abs(Math.sin(progress * Math.PI * 2)) * 30;
          context.translate(0, -bounceOffset);
          break;
          
        case "pulse":
          const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
          context.translate(anim.x + anim.width/2, anim.y + anim.height/2);
          context.scale(scale, scale);
          context.translate(-(anim.x + anim.width/2), -(anim.y + anim.height/2));
          break;
          
        case "float":
          const floatOffsetX = Math.sin(progress * Math.PI * 2) * 20;
          const floatOffsetY = Math.cos(progress * Math.PI * 2) * 20;
          context.translate(floatOffsetX, floatOffsetY);
          break;
      }
      
      // Draw the animation image
      context.drawImage(anim.image, anim.x, anim.y, anim.width, anim.height);
      
      // Draw selection border if selected
      if (selectedElement?.id === anim.id) {
        context.globalAlpha = 1;
        context.strokeStyle = "#FFD700";
        context.lineWidth = 2;
        context.strokeRect(anim.x - 2, anim.y - 2, anim.width + 4, anim.height + 4);
      }
      
      context.restore();
    });

    // Reset opacity for other elements
    context.globalAlpha = 1;

    // Draw other elements
    elements.forEach((element) => {
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
        }
      } else if (element.type === "text" && element.text) {
        context.font = `${element.textSize}px Comic Sans MS`;
        context.fillStyle = element.strokeColor;
        context.fillText(element.text, element.points[0].x, element.points[0].y);
      } else if (element.roughElement) {
        roughCanvasRef.current.draw(element.roughElement);
      }
    });

    // Restore context state
    context.restore();

    // Draw alert message if present
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
        tempContext.font = `${element.textSize}px 'Bubblegum Sans', cursive`;
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
          showCanvasAlert("Wow! Your picture is ready!");
        };
      } else {
        console.error("Error from server:", data.error);
        showCanvasAlert("Uh-oh! Can't make picture!");
      }
    } catch (error) {
      console.error("Network error:", error);
      showCanvasAlert("Oops! Something went wrong!");
    }
  };



  
  // Save canvas as image
  const saveCanvasAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to render the content
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempContext = tempCanvas.getContext("2d");

    if (!tempContext) return;

    // Fill background with page color or white
    tempContext.fillStyle = pageColor || "#ffffff";
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Apply pan and scale transformations
    tempContext.translate(panOffset.x, panOffset.y);
    tempContext.scale(scale, scale);

    // Draw all elements
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

    // Reset transformations
    tempContext.scale(1 / scale, 1 / scale);
    tempContext.translate(-panOffset.x, -panOffset.y);

    // Create download link
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = tempCanvas.toDataURL("image/png");
    link.click();

    showCanvasAlert("Image downloaded successfully!");
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
      showCanvasAlert("Can't start recording! Try again!");
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
        showCanvasAlert("Yay! Your words are on the canvas!");
      } else {
        throw new Error("No transcription returned");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      showCanvasAlert("Oops! Can't understand your words!");
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
        setIsAnimationOpen(true);
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

  // Add animation images
  const animatedImages = [
    { animation: "bounce", src: magic3 },
    { animation: "bounce", src: "https://th.bing.com/th/id/R.cd72868df85f071f89a38bf46e5b7bce?rik=mE8vjKvMme3d7A&riu=http%3a%2f%2fpluspng.com%2fimg-png%2fbubble-png-hd-bubble-white-background-pictures-1386.jpg&ehk=%2fhM0KIBw05w9Z0mmmtRg6mxYRaySigJymTDg5CCqrXw%3d&risl=&pid=ImgRaw&r=0" },
    { animation: "pulse", src: "https://th.bing.com/th/id/OIP.OGOZphimHSHq45r72eEamQHaHR?pid=ImgDet&w=474&h=465&rs=1"},
    { animation: "pulse", src: "https://static.vecteezy.com/system/resources/previews/023/550/814/original/blue-glowing-lights-effects-isolated-on-transparent-background-solar-flare-with-beams-and-spotlight-glow-effect-starburst-with-sparkles-png.png"},
    { animation: "float", src: magic2 },
    { animation: "bounce", src: magic1 },
    { animation: "float", src: cartoon4 },
    { animation: "bounce", src: cartoon1 },
    { animation: "float", src: cartoon2 },
    { animation: "float", src: cartoon5 },
  ];


  // Add animation function
  const addAnimation = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = animatedImages[index];
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageData.src;
    
    image.onload = () => {
      const aspectRatio = image.width / image.height;
      const width = 200;
      const height = width / aspectRatio;
      
      const newAnimation = {
        id: generateId(),
        type: "animation",
        image,
        x: Math.random() * (canvas.width - width),
        y: Math.random() * (canvas.height - height),
        width,
        height,
        animationType: imageData.animation,
        startTime: Date.now(),
        duration: 3000
      };

      setAnimations(prev => [...prev, newAnimation]);
      redrawCanvas();
    };
  };

  // Update animation frame effect
  useEffect(() => {
    let animationFrameId;
    
    const animate = () => {
      redrawCanvas();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    if (animations.length > 0) {
      animate();
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [animations, elements, selectedElement, pageColor, panOffset, scale]);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: pageColor || "white",
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
        className="absolute flex items-center p-4 space-x-3 bg-white shadow-lg bg-opacity-90 top-4 rounded-2xl"
        style={{
          left: "1.5rem",
          right: videoSectionOpen ? `${window.innerWidth * 0.25 + 24}px` : "1.5rem",
        }}
      >
        <div className="flex space-x-2">
          <button
            className={`p-3 rounded-xl ${tool === "pencil" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={() => setTool("pencil")}
            title="Pencil"
          >
            <Pencil size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Draw</span>
          </button>
          <button
            className={`p-3 rounded-xl ${tool === "rectangle" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Box</span>
          </button>
          <button
            className={`p-3 rounded-xl ${tool === "circle" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Circle</span>
          </button>
          <button
            className={`p-3 rounded-xl ${tool === "cartoon" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={toggleCartoonMenu}
            title="Cartoon Figures"
          >
            <ImageIcon size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Stickers</span>
          </button>
          <button
            className={`p-3 rounded-xl ${tool === "text" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Words</span>
          </button>
          <button
            className={`p-3 rounded-xl ${tool === "eraser" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Erase</span>
          </button>
          <button
            className={`p-3 rounded-xl ${tool === "move" ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={() => setTool("move")}
            title="Pan Canvas"
          >
            <Move size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Move</span>
          </button>
        </div>

        <div className="w-1 h-8 mx-1 bg-indigo-300 rounded-full" />

        <div className="flex space-x-2">
          <div className="flex items-center p-2 space-x-2 bg-purple-100 shadow-md rounded-xl">
            <button
              className="p-1 transition bg-purple-500 rounded-full hover:bg-purple-600"
              onClick={decreaseStrokeWidth}
              title="Smaller Lines"
            >
              <Minus size={16} className="text-white" />
            </button>
            <span className="w-6 text-sm font-bold text-center text-purple-800">{strokeWidth}</span>
            <button
              className="p-1 transition bg-purple-500 rounded-full hover:bg-purple-600"
              onClick={increaseStrokeWidth}
              title="Bigger Lines"
            >
              <Plus size={16} className="text-white" />
            </button>
            <span className="text-xs font-bold text-purple-800">Line</span>
          </div>
          <div className="flex items-center p-2 space-x-2 bg-purple-100 shadow-md rounded-xl">
            <button
              className="p-1 transition bg-purple-500 rounded-full hover:bg-purple-600"
              onClick={decreaseTextSize}
              title="Smaller Text"
            >
              <Minus size={16} className="text-white" />
            </button>
            <span className="w-6 text-sm font-bold text-center text-purple-800">{textSize}</span>
            <button
              className="p-1 transition bg-purple-500 rounded-full hover:bg-purple-600"
              onClick={increaseTextSize}
              title="Bigger Text"
            >
              <Plus size={16} className="text-white" />
            </button>
            <span className="text-xs font-bold text-purple-800">Text</span>
          </div>
        </div>

        <div className="w-1 h-8 mx-1 bg-white rounded-full" />

        <div className="flex space-x-2">
          <div className="flex flex-col items-center">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 border-2 border-indigo-300 rounded-full shadow-md cursor-pointer"
              title="Pick a Color"
            />
            <span className="mt-1 text-xs font-bold text-indigo-800">Color</span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              value={fillColor || "#ffffff"}
              onChange={(e) => setFillColor(e.target.value === "#ffffff" ? "" : e.target.value)}
              className="w-8 h-8 border-2 border-indigo-300 rounded-full shadow-md cursor-pointer"
              title="Fill Color"
            />
            <span className="mt-1 text-xs font-bold text-indigo-800">Fill</span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              value={pageColor || "#ffffff"}
              onChange={(e) => setPageColor(e.target.value === "#ffffff" ? "" : e.target.value)}
              className="w-8 h-8 border-2 rounded-full shadow-md cursor-pointer white"
              title="Background Color"
            />
            <span className="mt-1 text-xs font-bold white">Page</span>
          </div>
          <button
            className="p-2 transition bg-white shadow-md rounded-xl hover:bg-white"
            onClick={() => setPageColor("")}
            title="Reset Background"
          >
            <Palette size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Reset</span>
          </button>
        </div>

        <div className="w-1 h-8 mx-1 bg-indigo-300 rounded-full" />

        <div className="flex space-x-2">
          <button
            className={`p-2 rounded-xl ${videoSectionOpen ? "bg-indigo-400" : "bg-indigo-100"} hover:bg-indigo-200 shadow-md transition`}
            onClick={toggleVideoSection}
            title="Videos"
          >
            <Youtube size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Videos</span>
          </button>
        </div>

        <div className="w-1 h-8 mx-1 bg-indigo-300 rounded-full" />

        <div className="flex space-x-2">
          <button
            className="p-2 transition bg-indigo-100 shadow-md rounded-xl hover:bg-indigo-200"
            onClick={undo}
            title="Undo"
            disabled={historyIndex <= 0}
          >
            <Undo size={24} className={historyIndex <= 0 ? "text-gray-400" : "text-indigo-700"} />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Undo</span>
          </button>
          <button
            className="p-2 transition bg-indigo-100 shadow-md rounded-xl hover:bg-indigo-200"
            onClick={redo}
            title="Redo"
            disabled={historyIndex >= history.length - 1}
          >
            <Redo size={24} className={historyIndex >= history.length - 1 ? "text-gray-400" : "text-indigo-700"} />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Redo</span>
          </button>
        </div>

        <div className="w-1 h-8 mx-1 bg-indigo-300 rounded-full" />

        <div className="flex space-x-2">
          <button
            className="p-2 transition bg-indigo-100 shadow-md rounded-xl hover:bg-indigo-200"
            onClick={zoomIn}
            title="Zoom In"
          >
            <ZoomIn size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Zoom In</span>
          </button>
          <button
            className="p-2 transition bg-indigo-100 shadow-md rounded-xl hover:bg-indigo-200"
            onClick={zoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={24} className="text-indigo-700" />
            <span className="block mt-1 text-xs font-bold text-indigo-800">Zoom Out</span>
          </button>
          <button
            className="p-2 transition bg-indigo-100 shadow-md rounded-xl hover:bg-indigo-200"
            onClick={saveCanvasAsImage}
            title="Reset View"
          >
            <span className="text-xs font-bold text-indigo-800">Picture</span>
          </button>
        </div>

        <div className="w-1 h-8 mx-1 bg-indigo-300 rounded-full" />

        <div className="flex space-x-2">
          <button
            className="p-2 transition bg-red-100 shadow-md rounded-xl hover:bg-red-200"
            onClick={clearCanvas}
            title="Clear Canvas"
          >
            <Trash2 size={24} className="text-red-600" />
            <span className="block mt-1 text-xs font-bold text-red-600">Clear</span>
          </button>
          <button
            className="p-2 transition bg-green-100 shadow-md rounded-xl hover:bg-green-200"
            onClick={saveToDatabase}
            title="Save to Database"
          >
            <Download size={24} className="text-green-600" />
            <span className="block mt-1 text-xs font-bold text-green-600">Save</span>
          </button>
        </div>
      </div>

      {/* Cartoon Menu */}
      {cartoonMenuOpen && (
        <div className="absolute p-6 transform -translate-x-1/2 bg-white border-4 border-indigo-300 shadow-2xl top-24 left-1/2 rounded-2xl">
          <h3 className="mb-4 text-2xl font-bold text-indigo-800">Choose a Fun Sticker!</h3>
          <div className="grid grid-cols-3 gap-4">
            {cartoonFigures.map((figure) => (
              <div
                key={figure.id}
                className={`p-3 cursor-pointer rounded-xl hover:bg-indigo-200 ${
                  selectedCartoon === figure.id ? "bg-indigo-300" : "bg-indigo-100"
                } shadow-md transition`}
                onClick={() => selectCartoon(figure.id)}
              >
                <img src={figure.src || "/placeholder.svg"} alt={figure.name} className="object-contain w-24 h-24" />
                <p className="mt-2 text-base font-bold text-center text-indigo-800">{figure.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Section */}
      {videoSectionOpen && (
        <div className="fixed top-0 right-0 z-30 flex flex-col w-1/4 h-screen bg-white shadow-2xl rounded-l-2xl">
          {/* Close Button */}
          <button
            className="absolute z-40 p-2 transition bg-red-500 rounded-full top-4 right-4 hover:bg-red-600"
            onClick={toggleVideoSection}
            title="Close"
          >
            <X size={20} className="text-white" />
          </button>

          {/* Inner content with scroll */}
          <div className="relative flex flex-col flex-1 p-6 overflow-y-auto" onScroll={handleVideoSectionScroll}>
            {/* Search Bar */}
            {!selectedVideoId && (
              <div className="flex items-center mb-6">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleVideoSearch(videoSearchQuery)}
                    placeholder="Find fun videos!"
                    className="w-full p-3 pr-12 text-base text-indigo-800 placeholder-indigo-400 border-2 border-indigo-300 bg-indigo-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    className="absolute p-2 bg-indigo-500 rounded-full right-3 top-2.5 hover:bg-indigo-600 transition"
                    onClick={() => handleVideoSearch(videoSearchQuery)}
                    title="Search"
                  >
                    <Search size={16} className="text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Video or Search Results */}
            {selectedVideoId ? (
              <div className="flex flex-col">
                {/* Enlarged YouTube Video */}
                <div className="relative mb-4 h-80">
                  <div className="absolute top-0 left-0 w-full h-full">
                    <YouTube videoId={selectedVideoId} opts={playerOptions} />
                  </div>
                </div>

                {/* Back Button */}
                <button
                  className="w-full px-6 py-2 text-base font-bold text-white transition bg-indigo-500 shadow-md rounded-xl hover:bg-indigo-600"
                  onClick={() => setSelectedVideoId(null)}
                >
                  Back to Videos
                </button>
              </div>
            ) : (
              <>
                {/* YouTube Kids Button */}
                <button
                  className="w-full px-6 py-2 mb-6 text-base font-bold text-white transition bg-indigo-500 shadow-md rounded-xl hover:bg-indigo-600"
                  onClick={openYouTubeKids}
                >
                  Visit YouTube Kids!
                </button>

                {/* Video Results */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-base font-bold text-center text-indigo-800">Finding videos...</p>
                  ) : error ? (
                    <p className="text-base font-bold text-center text-red-500">{error}</p>
                  ) : videoResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {videoResults.map((video) => (
                        <div
                          key={video.id.videoId}
                          className="p-3 transition-transform bg-indigo-100 shadow-md cursor-pointer rounded-xl hover:scale-105"
                          onClick={() => setSelectedVideoId(video.id.videoId)}
                        >
                          <img
                            src={video.snippet.thumbnails.medium.url || "/placeholder.svg"}
                            alt={video.snippet.title}
                            className="object-cover w-full h-20 rounded-lg"
                          />
                          <h3 className="mt-2 text-sm font-bold text-indigo-800 line-clamp-2">{video.snippet.title}</h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base font-bold text-center text-indigo-800">
                      Type something to find cool videos!
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
        className="absolute bottom-12"
        style={{
          right: videoSectionOpen ? `${window.innerWidth * 0.25 + 48}px` : "3rem",
        }}
      >
        <button
          className="flex items-center justify-center w-16 h-16 transition rounded-full shadow-2xl bg-gradient-to-r from-indigo-500 to-purple-500 animate-bounce-slow hover:scale-110"
          onClick={toggleMagicMenu}
          title="Magic Fun"
        >
          <span className="text-3xl">✨</span>
        </button>
        {magicMenuOpen && (
          <div className="absolute right-0 p-4 bg-white border-4 border-indigo-300 shadow-2xl rounded-2xl bottom-20">
            <button
              className="block w-full px-6 py-3 mb-2 text-base font-bold text-indigo-800 transition rounded-xl hover:bg-indigo-100"
              onClick={() => handleMagicOption("Make Image")}
            >
              🖌️ Picture
            </button>
            {/* <button
              className="block w-full px-6 py-3 mb-2 text-base font-bold text-indigo-800 transition rounded-xl hover:bg-indigo-100"
              onClick={() => handleMagicOption("Make Video")}
            >
              📹 Video
            </button> */}
            <button
              className="block w-full px-6 py-3 mb-2 text-base font-bold text-indigo-800 transition rounded-xl hover:bg-indigo-100"
              onClick={() => handleMagicOption("Make Animation")}
            >
              🎞️ Animation
            </button>
            <button
              className="block w-full px-6 py-3 text-base font-bold text-indigo-800 transition rounded-xl hover:bg-indigo-100"
              onClick={() => handleMagicOption("Audio")}
            >
              {isRecording ? "🎤 Stop Talking" : "🎵 Talk"}
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="absolute px-4 py-2 bg-white shadow-md rounded-xl bottom-4 left-4">
        <span className="text-base font-bold text-indigo-800">Zoom: {Math.round(scale * 100)}%</span>
      </div>

      {/* Recording Animation */}
      {isRecording && (
        <div className="fixed z-50 flex flex-col items-center bottom-32 right-12">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute w-20 h-20 bg-red-400 rounded-full opacity-75 animate-ping"></div>
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
            className="px-6 py-2 mt-4 text-base font-bold text-white transition bg-red-500 rounded-xl hover:bg-red-600"
          >
            Stop Talking
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute w-20 h-20 border-4 border-indigo-200 rounded-full"></div>
              <div className="absolute w-20 h-20 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-xl font-bold text-white">Loading Fun...</p>
          </div>
        </div>
      )}

      {/* Animation Panel */}
      {isAnimationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-lg transform animate-[bounceIn_0.5s_ease-out]"
            style={{
              animation: `
                bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                float 3s ease-in-out infinite
              `,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add Animated Pictures</h3>
              <button 
                onClick={() => setIsAnimationOpen(false)}
                className="text-gray-500 transition-colors hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg animate-[pulse_2s_infinite]">
                <div className="text-lg font-medium text-center text-white">
                  ✨ Click an image to add animation ✨
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {animatedImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => addAnimation(i)}
                    className="relative overflow-hidden transition-transform transform rounded-lg cursor-pointer aspect-square hover:scale-105"
                  >
                    <img 
                      src={img.src} 
                      alt={`Animation ${i + 1}`}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center transition-opacity bg-black opacity-0 bg-opacity-30 hover:opacity-100">
                      <span className="font-bold text-white">{img.animation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}