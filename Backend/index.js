const express = require('express')
const mongoose = require('mongoose')
const User = require('./model/user')
const cors = require('cors')
const DraftCanvas = require('./model/draftCanvas')
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt');


dotenv.config();

const app = express() ; 
const port = process.env.PORT;
// const ngrok = process.env.NGROK_ENDPOINT ;

const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5001',
  'https://imaginationbook-5d4r.onrender.com',
  process.env.NGROK_ENDPOINT?.trim(), // safely add ngrok only if defined and clean
];

// console.log(process.env.NGROK_ENDPOINT)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like from Postman, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log("Blocked CORS for origin:", origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json())
app.use(express.urlencoded({extended: true}))

// app.use(cors({
//   origin: 'https://9461-35-240-135-136.ngrok-free.app',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true,
// }));



mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log(err))



app.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  // console.log(name, email, password, confirmPassword);
  // console.log("Signup page");

  if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password and Confirm Password do not match" });
  }

  try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ error: "Email is already registered" });
      }

      // // Create and save new user
      // const user = new User({ name, email, password });
      // await user.save();

      // Setup email transport

      // console.log(process.env.EMAIL) ; 
      // console.log(process.env.PASSWORD) ;
      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD,
          }
      });

    const mailOptions = {
        from: 'imaginationbookpvtltd@gmail.com',
        to: email,
        subject: '🎉 Welcome to Imagination Book – Let Your Story Come to Life',
        html: `
        <html>
            <head>
              <style>
                @keyframes float {
                  0% { transform: translateY(0px); }
                  50% { transform: translateY(-8px); }
                  100% { transform: translateY(0px); }
                }

                @keyframes colorShift {
                  0% { background: linear-gradient(45deg, #ff9a9e, #fad0c4); }
                  50% { background: linear-gradient(45deg, #a1c4fd, #c2e9fb); }
                  100% { background: linear-gradient(45deg, #ff9a9e, #fad0c4); }
                }

                .container {
                  font-family: 'Comic Sans MS', 'Arial', sans-serif;
                  background: #f0f8ff;
                  padding: 20px;
                  border-radius: 15px;
                  color: #333;
                  max-width: 600px;
                  margin: auto;
                  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                  animation: float 4s ease-in-out infinite;
                  transform-style: preserve-3d;
                  perspective: 1000px;
                }

                .header {
                  text-align: center;
                  font-size: 28px;
                  color: #ff6f61;
                  animation: float 3s ease-in-out infinite;
                  transform: rotateX(10deg) rotateY(10deg);
                }

                .subheader {
                  text-align: center;
                  font-size: 18px;
                  color: #6a5acd;
                  margin-top: 10px;
                  font-weight: bold;
                }

                .content {
                  font-size: 16px;
                  margin-top: 20px;
                  line-height: 1.6;
                }

                .list-item {
                  margin: 10px 0;
                }

                .button {
                  display: inline-block;
                  background: linear-gradient(45deg, #ff6f61, #ff9a9e);
                  color: white;
                  padding: 12px 24px;
                  margin-top: 20px;
                  border-radius: 30px;
                  text-decoration: none;
                  font-weight: bold;
                  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
                  transition: all 0.4s ease;
                  animation: colorShift 6s infinite alternate;
                }

                .button:hover {
                  transform: scale(1.1) rotate(2deg);
                  box-shadow: 0px 8px 20px rgba(255, 111, 97, 0.6);
                }

                .footer {
                  margin-top: 30px;
                  font-size: 14px;
                  text-align: center;
                  color: #666;
                  font-style: italic;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">🎉 Welcome to Imagination Book! 🎨✨</div>
                <div class="subheader">Let Your Story Come to Life</div>

                <div class="content">
                  Hi ${name},<br><br>

                  We’re super excited to have you join <strong>Imagination Book</strong> — the place where your ideas turn into magical stories, animations, and adventures! 🌟<br><br>

                  Here's what you can do next:
                  <ul>
                    <li class="list-item">📖 Start a new story with AI-powered visuals</li>
                    <li class="list-item">🎬 Add animations and videos that move with your imagination</li>
                    <li class="list-item">🌐 Share your creation with the world in just a few clicks</li>
                  </ul>

                  Your imagination is the limit — and we’re here to make it even bigger! 🚀<br><br>

                  <a href="https://imaginationbook-5d4r.onrender.com/" class="button">🌟 Start Creating Now!</a><br><br>
                </div>

                <div class="footer">
                  Need help? Just reply to this email or visit our Help Center.<br><br>
                  Thank you for choosing Imagination Book. Let’s make stories unforgettable! 🌈
                </div>
              </div>
            </body>
          </html>

        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      
      // console.log(result) ;
       // Create and save new user
       const saltRounds = 10;
       const hashedPassword = await bcrypt.hash(password, saltRounds);
       const user = new User({ name, email, password : hashedPassword });
       await user.save();

      return res.status(200).json({ message: 'Signup successful, email sent' });

  } catch (err) {
      console.error("Signup error:", err);
      if (err.code === 11000) {
          return res.status(400).json({ error: "Email already exists" });
      }
      return res.status(500).json({ error: "Server error during signup" });
  }
});


app.post('/login' , async (req,res)=>
{
    console.log("Login page") ; 
    const {email, password} = req.body ; 
    const user = await User.findOne({email}) ;
    console.log(user) ; 
    if(!user)
    {
        return res.status(400).json({error : "User not found"})
    }
    else
    {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) 
      {
        return res.status(400).json({ error: "Invalid password" });
      } 
      else 
      {
        return res.status(200).json({ message: "Login successful" });
      }
    }
        // if(user.password !== password)
        // {
        //     return res.status(400).json({error : "Invalid password"})
        // }
        // else
        // {
        //     return res.status(200).json({message : "Login successful"})
        // }
    //}
    
})

// Save Drawing (Create)
app.post("/api/drawings/:email", async (req, res) => {

  console.log(req.body) ;
  try {
    const drawing = new DraftCanvas({
      ...req.body,
      userEmail: req.params.email,
      board: req.body.board,
    });

    await drawing.save();
    res.status(201).json({ id: drawing._id });
  } catch (error) {
    res.status(500).json({ error: "Failed to save drawing" });
  }
});

// Update Drawing
app.put("/api/drawings/:id/:email", async (req, res) => {
  console.log(req.body)
  try {
    const drawing = await DraftCanvas.findOneAndUpdate(
      { _id: req.params.id, userEmail: req.params.email},
      { elements: req.body.elements, name: req.body.name, board: req.body.board  },

      { new: true }
    );
    if (!drawing) return res.status(404).json({ error: "Drawing not found" });
    res.json({ id: drawing._id });
  } catch (error) {
    res.status(500).json({ error: "Failed to update drawing" });
  }
});

// Load Drawing
app.get("/api/drawings/:id/:email", async (req, res) => {
  try 
  {
    const drawing = await DraftCanvas.findOne({
      _id: req.params.id,
      userEmail: req.params.email,
    
       
    });

    console.log(drawing) ; 
    if (!drawing) return res.status(404).json({ error: "Drawing not found" });
    res.json(drawing);
  } 
  catch (error) 
  {
    res.status(500).json({ error: "Failed to load drawing" });
  }
});

app.get("/api/drawings/:email", async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const drafts = await DraftCanvas.find({ userEmail: email }).sort({ updatedAt: -1 });
    res.json(drafts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching drafts' });
  }
});




if(!port)
  {
    console.log("Port not found") ; 
  }
app.listen(port, (req,res) =>
{
    console.log(`Server is running on port ${port}`)
})