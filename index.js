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

// --- Middleware ---

// Configure CORS to allow requests from your frontend applications.
// This single configuration block is sufficient.
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://mustofa-mamun-website-react.vercel.app',
    'https://www.mustofamamun.com',
    'https://mustofamamun.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies in requests.
app.use(express.json());


// --- MongoDB Setup ---
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zedvr4o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


// --- Google Drive Setup ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Multer setup for handling file uploads in memory.
const upload = multer({ storage: multer.memoryStorage() });


// --- Authentication Middleware ---
// This function verifies the JWT for protected routes.
const authenticate = (req, res, next) => {
  // Extract token from "Bearer <token>"
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next(); // Token is valid, proceed to the route handler.
  } catch (err) {
    res.status(400).send({ message: 'Invalid token.' });
  }
};


// --- Database Initialization and Route Registration ---
async function initialize() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("Mustofa_Mamun_DB");
    
    // Create initial user if one doesn't exist
    const userCollection = db.collection("users");
    if (await userCollection.countDocuments() === 0) {
      await userCollection.insertOne({
        email: process.env.USER_EMAIL,
        password: await bcrypt.hash(process.env.USER_PASSWORD, 10),
      });
      console.log("Initial user created.");
    }

    // You can add other initial data seeding here, like for courses.

  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    // Register all application routes after DB connection attempt.
    registerRoutes();
  }
}

function registerRoutes() {
  const db = client.db("Mustofa_Mamun_DB");
  const fileCollection = db.collection("files");
  const courseCollection = db.collection("courses");
  const profileCollection = db.collection("profile");
  const researchCollection = db.collection("research");

  // --- Root Route ---
  app.get("/", (req, res) => res.send("Welcome to Mustofa Server"));

  // --- Login Route ---
  app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.collection("users").findOne({ email });
        if (!user) {
            return res.status(400).send({ message: "Invalid credentials" });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).send({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.send({ message: "Login successful", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send({ message: "Server error during login." });
    }
  });

  // --- Course Routes (Protected) ---
  // These routes require a valid token to be accessed.
  app.get("/courses", async (req, res) => {
    try {
      // FIX: Added .sort({ _id: -1 }) to return newest courses first.
      const courses = await courseCollection.find({}).sort({ _id: -1 }).toArray();
      res.send(courses);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch courses", error });
    }
  });

  app.get("/courses/:code", async (req, res) => {
    try {
      const course = await courseCollection.findOne({ code: req.params.code });
      if (course) {
        res.send(course);
      } else {
        res.status(404).send({ message: "Course not found" });
      }
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch course", error });
    }
  });

  app.post("/courses", authenticate, async (req, res) => {
    try {
      const { code, title, image, university } = req.body;
      const newCourse = { code, title, image, university, link: `/courses/${code}`, details: {} };
      const result = await courseCollection.insertOne(newCourse);
      res.status(201).send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to add course", error });
    }
  });

  app.put("/courses/:id", authenticate, async (req, res) => {
    try {
      const { details } = req.body;
      const result = await courseCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { details } });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to update course details", error });
    }
  });

  app.delete("/courses/:id", authenticate, async (req, res) => {
      try {
          const result = await courseCollection.deleteOne({ _id: new ObjectId(req.params.id) });
          if (result.deletedCount === 1) {
              res.status(200).send({ message: "Course deleted successfully" });
          } else {
              res.status(404).send({ message: "Course not found" });
          }
      } catch (error) {
          res.status(500).send({ message: "Failed to delete course", error });
      }
  });

  // --- File Routes (Public) ---
  // FIX: The 'authenticate' middleware has been removed from these routes
  // to match the original working code and resolve the 401 error.
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
      console.error("Error adding file:", error);
      res.status(500).send({ message: "Failed to add file", error: error.message });
    }
  });

  app.put("/files/:id", upload.single('file'), async (req, res) => {
    try {
      const { title, type, course } = req.body;
      let fileLink = req.body.link; // Keep existing link if no new file is uploaded

      if (req.file) {
        // If a new file is uploaded, upload it to Google Drive
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
        fileLink = file.data.webViewLink;
      }

      const result = await fileCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { title, type, course, link: fileLink } }
      );
      res.send(result);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).send({ message: "Failed to update file", error: error.message });
    }
  });

  app.delete("/files/:id", async (req, res) => {
    try {
      // Note: This will delete the record from MongoDB, but not the file from Google Drive.
      // Implementing file deletion from Drive would require getting the file ID and calling drive.files.delete().
      const result = await fileCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to delete file", error });
    }
  });

  // --- Profile Routes (Protected) ---
  app.get("/profile", async (req, res) => {
    try {
      const profile = await profileCollection.findOne({});
      res.send(profile);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch profile", error });
    }
  });

  app.put("/profile", authenticate, async (req, res) => {
    try {
      const result = await profileCollection.updateOne({}, { $set: req.body }, { upsert: true });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to update profile", error });
    }
  });

  // --- Research Routes (Protected) ---
  app.get("/research", async (req, res) => {
    try {
      const research = await researchCollection.find({}).toArray();
      res.send(research);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch research", error });
    }
  });

  app.post("/research", authenticate, async (req, res) => {
    try {
      const result = await researchCollection.insertOne(req.body);
      res.status(201).send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to add research item", error });
    }
  });

  app.put("/research/:id", authenticate, async (req, res) => {
    try {
      const { _id, ...data } = req.body;
      const result = await researchCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to update research item", error });
    }
  });

  app.delete("/research/:id", authenticate, async (req, res) => {
    try {
      const result = await researchCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to delete research item", error });
    }
  });
}

// --- Server Initialization ---
initialize().then(() => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
});
