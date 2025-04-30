import React, { useState, useEffect } from 'react';
import { Book, LogOut, History, Star, Edit, Image, PlayCircle, Sparkles, Rocket, Zap } from 'lucide-react';
import { useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from 'react-redux';
import { setUserEmail, setUserPassword, clearCredentials } from '../Redux/slices/user/user';
import { Player } from "@lottiefiles/react-lottie-player";
import drawingAnimation1 from "../assets/paint1.json";  
import drawingAnimation2 from "../assets/paint2.json"; 
import drawingAnimation3 from "../assets/paint3.json"; 

export default function ImaginationBookHome() {
  const [activeTab, setActiveTab] = useState('explore');
  const [animateBackground, setAnimateBackground] = useState(0);
  const navigate = useNavigate(); 
  const [draftItems, setDraftItems] = useState([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [error, setError] = useState('');

  const shouldShowAlert = () => {
    const lastShownDate = localStorage.getItem('lastAlertShown');
    const today = new Date().toDateString();
    
    if (!lastShownDate || lastShownDate !== today) {
      localStorage.setItem('lastAlertShown', today);
      return true;
    }
    return false;
  };

  const [showAlert, setShowAlert] = useState(shouldShowAlert());

  const email = useSelector((state) => state.user?.userEmail)
  const password = useSelector((state) => state.user?.userPassword);

  const dispatch = useDispatch();

  
  let finalEmail = localStorage?.getItem("email") || email;
  let finalPassword = localStorage?.getItem("password") || password;

  if(!finalEmail && !finalPassword) { 
    navigate("/");
  }

const featured = 

[
  {name:"Amazing Drawings" , image: "./cover-ItI.png" , desc: "Draw your imagination, enhance with ai"} , 
  {name:"Words Garden" , image: "./cover-T2I.png" , desc: "Write your own story, let AI illustrate it"} ,
  {name:"Recite Stars" , image: "./cover-AtI.png" , desc: "Recite your story, let AI draw it"} , 
  {name:"YouTube Kids" , image: "./cover-yt.png" , desc: "Watch your favorite videos"} ,
]  

  // Animated background effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimateBackground(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Load avatar from localStorage on mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setSelectedAvatar(savedAvatar);
    } else {
      // Default avatar if none is saved
      setSelectedAvatar('https://th.bing.com/th/id/OIP.k6elsXFYXm-_KxR90MVzrQHaHa?w=2000&h=2000&rs=1&pid=ImgDetMain');
    }
  }, []);

  useEffect(() => {
    setShowAlert(shouldShowAlert());
  }, []);

  // Sample draft data
  const fetchDrafts = async (retryCount = 0) => {
    try {
      const response = await fetch(`https://imaginationbook.onrender.com/api/drawings/${email}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDraftItems(data);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error fetching drafts:", error);
      if (retryCount < 3) { // Limit retries to 3 attempts
        // Retry after 1 second
        setTimeout(() => fetchDrafts(retryCount + 1), 1000);
      } else {
        setError("Failed to load drafts. Please check your internet connection and try again.");
      }
    }
  };

  useEffect(() => {
    if (email) {
      fetchDrafts();
    }
  }, [email]);

  // Add a retry button handler
  const handleRetry = () => {
    setError(null);
    fetchDrafts();
  };

  // Predefined avatar options
  const avatarOptions = [
    "https://i.seadn.io/gae/Y3_9Lz2P3gGeqcbWGt261ChjZhU-Yn8pInui5jJs0rqlf9PI9GGInKMjkWcNG00Dh0KVVUGpZRr5StFhgGzmuOFwREyX9z-gbnXvyQ?auto=format&dpr=1&w=3840",
    "https://cdn3.iconfinder.com/data/icons/avatars-9/145/Avatar_Penguin-512.png",
    "https://cdn3.iconfinder.com/data/icons/avatars-9/145/Avatar_Cat-512.png",
    "https://cdn3.iconfinder.com/data/icons/avatars-9/145/Avatar_Dog-512.png",
    "https://cdn3.iconfinder.com/data/icons/avatars-9/145/Avatar_Frog-512.png",
    'https://th.bing.com/th/id/R.a6f439a438edb562e6df79d596dde1c6?rik=szk5YJE0Z9ra4g&riu=http%3a%2f%2fgetdrawings.com%2ffree-icon%2ffunny-profile-icons-70.png&ehk=91YpDGnXRtwVekDFaCMrsihwazF0m7Yfy%2b9%2bJvIBJFQ%3d&risl=&pid=ImgRaw&r=0',
    'https://th.bing.com/th/id/OIP.k6elsXFYXm-_KxR90MVzrQHaHa?w=2000&h=2000&rs=1&pid=ImgDetMain',
    'https://image.freepik.com/free-vector/pink-haired-girl-avatar_150357-47.jpg',
    'https://img.freepik.com/premium-photo/flat-no-picture-avatar-profile-picture_941097-35008.jpg',
    'https://th.bing.com/th/id/OIP.9138UUOtTozsyNf8Id1d-QHaHa?w=1920&h=1920&rs=1&pid=ImgDetMain',
    'https://img.freepik.com/premium-photo/girl-flat-cartoon-character-illustration_620650-2334.jpg',
    'https://img.freepik.com/premium-photo/3d-avatar-cartoon-character_113255-95117.jpg',
  ];

  // Handle avatar selection
  const handleAvatarSelect = (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
    localStorage.setItem('userAvatar', avatarUrl);
    setShowAvatarModal(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans bg-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated color dots */}
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full mix-blend-multiply"
            style={{
              left: `${(i * 7 + animateBackground) % 100}%`,
              top: `${(i * 13 + animateBackground/2) % 100}%`,
              width: `${20 + (i % 7) * 5}px`,
              height: `${20 + (i % 7) * 5}px`,
              backgroundColor: `hsl(${(i * 20) % 360}, 90%, 85%)`,
              filter: 'blur(8px)',
              opacity: 0.4,
              transform: `translateY(${Math.sin((animateBackground + i) / 10) * 10}px)`,
              transition: 'transform 0.5s ease-out'
            }}
          />
        ))}
        
        {/* Gradient waves */}
        <div className="absolute bottom-0 left-0 w-full h-20 opacity-10"
             style={{
               backgroundImage: 'linear-gradient(90deg, rgba(129,80,255,1) 0%, rgba(236,64,122,1) 50%, rgba(66,165,245,1) 100%)',
               backgroundSize: '200% 100%',
               backgroundPosition: `${animateBackground}% 0`,
               transition: 'background-position 0.5s ease-out'
             }}></div>
      </div>
      
      <div className="absolute transform top-1/4 left-10 -rotate-12 animate-float">
        <div className="w-16 h-16 transform rounded-lg shadow-xl bg-gradient-to-br from-blue-300 to-purple-300 perspective-800 rotateY-20 rotateX-10" 
             style={{boxShadow: '0 10px 30px -5px rgba(129,80,255,0.3), 0 5px 15px rgba(0, 0, 0, 0.1)'}}></div>
      </div>
      
      <div className="absolute transform bottom-1/3 right-10 rotate-12 animate-float-slow">
        <div className="w-12 h-12 rounded-full shadow-xl bg-gradient-to-br from-pink-300 to-purple-300" 
             style={{boxShadow: '0 10px 30px -5px rgba(236,64,122,0.3), 0 5px 15px rgba(0, 0, 0, 0.1)'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        <div className="container flex items-center justify-between mx-auto">
          <div className="flex items-center space-x-3">
            <div className="p-2 transform bg-white rounded-full shadow-lg rotate-3">
              <Book className="text-purple-600" size={28} />
            </div>
            <div className="relative">
              <span className="text-3xl font-bold text-white">ImaginationBook</span>
              <Sparkles className="absolute text-yellow-300 -top-2 -right-6" size={16} />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 animate-spin-slow opacity-70"></div>
              <img
                src={selectedAvatar}
                alt="user"
                className="relative z-10 w-10 h-10 border-2 border-white rounded-full cursor-pointer"
                onClick={() => setShowAvatarModal(true)}
              />
              <span className="absolute bottom-0 right-0 z-20 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
            </div>
            <button className="text-white transition-colors hover:text-yellow-300"
              onClick={() => {
                dispatch(clearCredentials())
                localStorage.clear();
              }}>
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-3xl">
            <h3 className="mb-4 text-xl font-bold text-gray-800">Choose Your Avatar</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {avatarOptions.map((avatar, index) => (
                <img
                  key={index}
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className={`w-16 h-16 rounded-full cursor-pointer border-2 ${
                    selectedAvatar === avatar ? 'border-purple-500' : 'border-transparent'
                  } hover:border-purple-300`}
                  onClick={() => handleAvatarSelect(avatar)}
                />
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200"
                onClick={() => setShowAvatarModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-white rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg"
                onClick={() => setShowAvatarModal(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative max-w-md p-6 bg-white shadow-2xl rounded-3xl animate-float">
            {/* Rainbow border effect */}
            <div className="absolute inset-0 border-4 border-transparent rounded-3xl animate-rainbow-border"></div>
            
            <div className="relative">
              {/* Close button */}
              <button 
                onClick={() => setShowAlert(false)}
                className="absolute p-2 text-gray-400 transition-colors -top-2 -right-2 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="space-y-4 text-center">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  🎨 Image Generation is Open! 🎨
                </h2>
                <div className="p-4 space-y-3 text-left bg-purple-50 rounded-2xl">
                  <p className="flex items-center text-lg font-medium text-purple-800">
                    <span className="mr-2">🖥️</span> 
                    You can generate images 30 hours every week!
                  </p>
                  <p className="flex items-center text-lg font-medium text-purple-800">
                    <span className="mr-2">🕕</span> 
                    Available Daily: 6:00 PM – 9:00 PM
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="flex items-center justify-center text-green-600">
                    <span className="mr-2">✅</span>
                    Create stunning images during these hours
                  </p>
                  <p className="flex items-center justify-center text-green-600">
                    <span className="mr-2">✅</span>
                    GPU power is reserved just for you — no waiting!
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-lg font-bold text-purple-600">
                    Plan your creations and make every minute count! 🚀
                  </p>
                </div>

                {/* Fun button */}
                <button
                  onClick={() => setShowAlert(false)}
                  className="px-8 py-3 mt-4 text-lg font-bold text-white transition-all transform rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  Let's Create! ✨
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-20 py-2 bg-white border-b border-purple-100 shadow-lg bg-opacity-80 backdrop-filter backdrop-blur-md">
        <div className="container flex justify-center mx-auto">
          <div className="flex p-1 space-x-2 bg-gray-100 rounded-full shadow-inner">
            <button 
              onClick={() => setActiveTab('explore')}
              className={`py-2 px-6 rounded-full flex items-center transition-all transform ${activeTab === 'explore' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md scale-105' 
                : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <Rocket size={18} className={`mr-2 ${activeTab === 'explore' ? 'animate-pulse' : ''}`} />
              Explore
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`py-2 px-6 rounded-full flex items-center transition-all transform ${activeTab === 'history' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105' 
                : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <History size={18} className={`mr-2 ${activeTab === 'history' ? 'animate-pulse' : ''}`} />
              My Creations
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container relative z-10 p-4 pt-8 mx-auto">
        {/* Welcome Banner */}
        {activeTab === 'explore' && (
          <div className="relative p-6 mb-8 overflow-hidden text-white transition-all transform shadow-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl hover:scale-102">
            <div className="absolute -right-10 -top-10 opacity-20">
              <div className="w-40 h-40 bg-white rounded-full filter blur-xl"></div>
            </div>
            <div className="absolute -bottom-8 -left-8 opacity-20">
              <div className="w-32 h-32 bg-yellow-300 rounded-full filter blur-xl"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center justify-between md:flex-row">
              <div>
                <h1 className="flex items-center mb-2 text-3xl font-bold md:text-4xl">
                  Welcome, Space Explorer! <Sparkles className="ml-2 text-yellow-300 animate-pulse" size={24} />
                </h1>
                <p className="mb-4 text-lg">Ready to blast off into a galaxy of imagination?</p>
                <button className="flex items-center px-8 py-3 font-bold text-purple-600 transition-all transform bg-white rounded-full shadow-lg hover:shadow-xl hover:scale-105"
                onClick={() => navigate('/board1')}
                >
                  <Zap className="mr-2" size={18} />
                  Start Creating
                </button>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 rounded-full opacity-50 bg-gradient-to-br from-yellow-300 to-pink-500 animate-pulse-slow"></div>
                  <div className="absolute flex items-center justify-center bg-white rounded-full inset-4 bg-opacity-20 backdrop-filter backdrop-blur-sm">
                    <Star className="text-yellow-300" size={48} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Story Canvas */}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
            <div className="overflow-hidden transition-all transform bg-white border border-blue-100 shadow-xl cursor-pointer group rounded-3xl hover:scale-105">
              <div className="relative flex items-center justify-center h-48 overflow-hidden rounded-t-3xl"
                onClick={() => navigate("/board1")}
              >
                <Player
                  autoplay
                  loop
                  src={drawingAnimation1}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    zIndex: 0,
                  }}
                />
                <div className="absolute inset-0 z-10 transition-opacity duration-300 bg-white opacity-0 group-hover:opacity-10"></div>
              </div>
              <div className="relative z-10 p-6 bg-white rounded-b-3xl">
                <h3 className="flex items-center mb-2 text-xl font-bold text-blue-600">
                  Magic Garden
                  <Sparkles className="ml-2 text-yellow-500" size={16} />
                </h3>
                <p className="text-gray-600">
                  Write your story and watch it transform into magical animations and illustrations!
                </p>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => navigate("/board1")}
                    className="flex items-center px-6 py-2 text-sm text-white transition-all transform bg-blue-500 rounded-full shadow-lg hover:bg-blue-400 hover:scale-105"
                  >
                    <Zap className="mr-1" size={14} />
                    Open Canvas
                  </button>
                </div>
              </div>
            </div>

            {/* Art Canvas */}
            <div className="overflow-hidden transition-all transform bg-white border border-blue-100 shadow-xl cursor-pointer group rounded-3xl hover:scale-105">
              <div className="relative flex items-center justify-center h-48 overflow-hidden rounded-t-3xl"
                onClick={() => navigate("/board2")}
              >
                <Player
                  autoplay
                  loop
                  src={drawingAnimation2}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    zIndex: 0,
                  }}
                />
                <div className="absolute inset-0 z-10 transition-opacity duration-300 bg-white opacity-0 group-hover:opacity-10"></div>
              </div>
              <div className="relative z-10 p-6 bg-white rounded-b-3xl">
                <h3 className="flex items-center mb-2 text-xl font-bold text-blue-600">
                  PlayPalette
                  <Sparkles className="ml-2 text-yellow-500" size={16} />
                </h3>
                <p className="text-gray-600">        
                  Describe what you imagine and watch as AI creates amazing artwork from your ideas!
                </p>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => navigate("/board2")}
                    className="flex items-center px-6 py-2 text-sm text-white transition-all transform bg-blue-500 rounded-full shadow-lg hover:bg-blue-400 hover:scale-105"
                  >
                    <Zap className="mr-1" size={14} />
                    Open Canvas
                  </button>
                </div>
              </div>
            </div>

            {/* Animation Canvas */}
            <div className="overflow-hidden transition-all transform bg-white border border-blue-100 shadow-xl cursor-pointer group rounded-3xl hover:scale-105">
              <div
                className="relative flex items-center justify-center h-48 overflow-hidden rounded-t-3xl"
                onClick={() => navigate("/board3")}
              >
                <Player
                  autoplay 
                  loop
                  src={drawingAnimation3}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    zIndex: 0,
                  }}
                />
                <div className="absolute inset-0 z-10 transition-opacity duration-300 bg-white opacity-0 group-hover:opacity-10"></div>
              </div>

              <div className="relative z-10 p-6 bg-white rounded-b-3xl">
                <h3 className="flex items-center mb-2 text-xl font-bold text-blue-600">
                  Animagic
                  <Sparkles className="ml-2 text-yellow-500" size={16} />
                </h3>
                <p className="text-gray-600">
                  Turn your ideas into animated stories using our creative AI-powered animation canvas!
                </p>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => navigate("/board3")}
                    className="flex items-center px-6 py-2 text-sm text-white transition-all transform bg-blue-500 rounded-full shadow-lg hover:bg-blue-400 hover:scale-105"
                  >
                    <Zap className="mr-1" size={14} />
                    Open Canvas
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* History/Drafts Section */}
        {activeTab === 'history' && (
          <div className="p-6 bg-white border border-purple-100 shadow-xl rounded-3xl">
            <h2 className="flex items-center mb-6 text-2xl font-bold text-purple-600">
              <Star className="mr-2 text-yellow-500" size={24} />
              My Magical Creations
            </h2>
            {draftItems.length > 0 ? (
              <div className="space-y-4">
                {draftItems.map((draft, index) => (
                  <div
                    key={`${draft.id || index}-${draft.name || 'draft'}`}
                    className="flex items-center justify-between p-4 transition-all transform border border-gray-200 cursor-pointer bg-gray-50 rounded-2xl hover:bg-gray-100 hover:scale-102 hover:shadow-md"
                  >
                    <div className="flex items-center">
                      <div className={`p-4 rounded-full mr-4 shadow-inner ${
                        draft.canvasType === 'story' ? 'bg-gradient-to-br from-blue-500 to-blue-400' : 
                        draft.canvasType === 'art' ? 'bg-gradient-to-br from-purple-500 to-purple-400' : 
                        'bg-gradient-to-br from-pink-500 to-pink-400'
                      }`}>
                        {draft.canvasType === 'story' ? <Edit size={24} className="text-white" /> : 
                         draft.canvasType === 'art' ? <Image size={24} className="text-white" /> : 
                         <PlayCircle size={24} className="text-white" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{draft.name}</h3>
                        <p className="text-sm text-gray-500">
                          Last edited: {new Date(draft.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="flex items-center px-6 py-2 text-sm text-white transition-all transform rounded-full shadow-md bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:scale-105"
                        onClick={() => {
                          if (draft.board === "Board1") {
                            navigate(`/draft1/${draft._id}`);
                          } 
                          else if(draft.board === "Board2") {
                            navigate(`/draft2/${draft._id}`);
                          }
                          else {
                            navigate(`/draft3/${draft._id}`);
                          }
                        }}
                      >
                        <Zap className="mr-1" size={14} />
                        Continue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="inline-block p-8 mb-4 rounded-full shadow-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <History size={64} className="text-white" />
                </div>
                <h3 className="text-2xl font-medium text-gray-800">No creations yet</h3>
                <p className="mb-6 text-gray-600">Your adventure is just beginning!</p>
                <button 
                  onClick={() => setActiveTab('explore')}
                  className="px-8 py-3 text-white transition-all transform rounded-full shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:shadow-xl hover:scale-105"
                >
                  Start Your First Creation
                </button>
              </div>
            )}
            {error && (
              <div className="p-4 mt-4 text-center">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 mt-2 text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Featured Creations (visible in Explore tab) */}
        {activeTab === 'explore' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center text-2xl font-bold text-gray-800">
                <Star className="mr-2 text-yellow-500" size={24} />
                Featured Space Creations
              </h2>
              <button className="px-4 py-2 text-sm font-medium text-purple-600 bg-gray-100 rounded-full hover:bg-gray-200">
                See All
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((item, index) => (
                <div key={`featured-${index}`} className="overflow-hidden transition-all transform bg-white border border-blue-100 shadow-lg cursor-pointer rounded-2xl hover:shadow-xl hover:scale-105">
                  <div className="relative overflow-hidden h-36 bg-gradient-to-br from-blue-100 to-purple-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-full bg-white bg-opacity-10" 
                      style={{
                        backgroundImage: `url(${item.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      ></div>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Sparkles className="text-yellow-500" size={16} />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 truncate">{item.name}</h3>
                    <p className="text-sm text-purple-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed z-30 bottom-8 right-8">
        <button className="relative p-4 text-white transition-all transform rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-xl hover:scale-110">
          <div className="absolute inset-0 bg-pink-400 rounded-full animate-ping-slow opacity-30"></div>
          <Rocket size={24} className="animate-slight-shake" />
        </button>
      </div>

      {/* Global CSS for custom animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-12deg); }
          50% { transform: translateY(-15px) rotate(-8deg); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-10px) rotate(16deg); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes slight-shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(3deg); }
          75% { transform: rotate(-3deg); }
        }

        @keyframes rainbow-border {
          0%, 100% { border-color: #60a5fa; }
          25% { border-color: #c084fc; }
          50% { border-color: #f472b6; }
          75% { border-color: #fde047; }
        }

        .animate-rainbow-border {
          animation: rainbow-border 4s linear infinite;
        }

        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }

        .rotateX-10 {
          transform: rotateX(10deg);
        }

        .rotateY-20 {
          transform: rotateY(20deg);
        }

        .perspective-800 {
          perspective: 800px;
        }

        .hover\:scale-105:hover {
          transform: scale(1.05);
        }

        .hover\:scale-102:hover {
          transform: scale(1.02);
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-slight-shake {
          animation: slight-shake 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}