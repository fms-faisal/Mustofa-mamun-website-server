const express = require("express");
const app = express();
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const multer = require("multer");
require("dotenv").config();
const { Readable } = require('stream');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://mustofa-mamun.web.app/'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zedvr4o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Google Drive setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const upload = multer({ storage: multer.memoryStorage() });

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
};

// Database connection and route registration
async function initialize() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    // Create initial user
    const userCollection = client.db("Mustofa_Mamun_DB").collection("users");
    const existingUser = await userCollection.findOne({ email: process.env.USER_EMAIL });
    if (!existingUser) {
      await userCollection.insertOne({
        email: process.env.USER_EMAIL,
        password: await bcrypt.hash(process.env.USER_PASSWORD, 10),
      });
    }
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    registerRoutes();
  }
}

function registerRoutes() {
  const fileCollection = client.db("Mustofa_Mamun_DB").collection("files");

  // Root URL route
  app.get("/", (req, res) => {
    res.send("Welcome to Mustofa Server");
  });

  // Login Endpoint
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await client.db("Mustofa_Mamun_DB").collection("users").findOne({ email });
    if (!user) return res.status(400).send({ message: "Invalid credentials" });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send({ message: "Invalid credentials" });
    
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.send({ message: "Login successful", token });
  });

  // Unprotected File Routes
  app.get("/files", async (req, res) => {
    try {
      const files = await fileCollection.find(req.query).toArray();
      res.send(files);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch files", error });
    }
  });

  app.post("/files", upload.single('file'), async (req, res) => {
    try {
      const { title, type, course } = req.body;
      const fileMetadata = {
        name: req.file.originalname,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
      };
  
      const bufferStream = new Readable();
      bufferStream.push(req.file.buffer);
      bufferStream.push(null);
  
      const media = {
        mimeType: req.file.mimetype,
        body: bufferStream
      };
  
      const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });
      const fileLink = file.data.webViewLink;
  
      const result = await fileCollection.insertOne({
        title,
        type,
        course,
        link: fileLink
      });
      res.status(201).send(result);
    } catch (error) {
      console.error("Error adding file:", error.message);
      console.error("Stack trace:", error.stack);
      res.status(500).send({ message: "Failed to add file", error: error.message });
    }
  });

  app.put("/files/:id", upload.single('file'), async (req, res) => {
    try {
      const { title, type, course } = req.body;
      let fileLink = req.body.link;

      if (req.file) {
        const fileMetadata = {
          name: req.file.originalname,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        };
        const media = {
          mimeType: req.file.mimetype,
          body: Buffer.from(req.file.buffer)
        };
        const file = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id, webViewLink'
        });
        fileLink = file.data.webViewLink;
      }

      const result = await fileCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { title, type, course, link: fileLink } }
      );
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to update file", error });
    }
  });

  app.delete("/files/:id", async (req, res) => {
    try {
      const result = await fileCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to delete file", error });
    }
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    db: client.topology.isConnected() ? "connected" : "disconnected"
  });
});

// Initialize database and start server
initialize().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});