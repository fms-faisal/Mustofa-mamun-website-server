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
app.use(express.json());


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

async function initialize() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("Mustofa_Mamun_DB");
    
    // Create initial user
    const userCollection = db.collection("users");
    if (await userCollection.countDocuments() === 0) {
      await userCollection.insertOne({
        email: process.env.USER_EMAIL,
        password: await bcrypt.hash(process.env.USER_PASSWORD, 10),
      });
    }

    // Seed Courses
    const courseCollection = db.collection("courses");
    if (await courseCollection.countDocuments() === 0) {
        await courseCollection.insertMany([
          { code: 'Econ2110', title: 'Macroeconomic Principles', image: '/images/Macroeconomic-Principles-img.jpg', link: '/courses/Econ2110', university: 'University of New Mexico', details: { syllabus: 'https://drive.google.com/file/d/1W3a-ir9I9hps4HWtPFdM91dTs7dURPeh/view', schedule: 'MWF at 10:00-10:50 am in ANTHO-163', instructor: 'Dr. Mustofa Mahmud Al Mamun', office: 'ECON 2002', hours: 'Mondays and Thursdays [1:00 pm - 2:00 pm]', email: 'mmamun@unm.edu', zoom: 'https://unm.zoom.us/j/9171407395', textbooks: [{description: 'Mankiw, N. Gregory. 2021. Principles of Macroeconomics. 9th ed. Mason, OH: CENGAGE Learning Custom Publishing.', status: 'Required'}], tas: [{ name: 'Ziyadkhan Gurbanli', office: 'ECON 2021', hours: 'Tuesdays and Fridays [1:00 pm - 2:00 pm]', email: 'zgurbanli@unm.edu' }, { name: 'Sujaan Aryal', office: 'ECON 2001', hours: 'Wednesdays and Fridays [10:00 - 11:00 AM]', email: 'saryal1@unm.edu' }] }},
          { code: 'Econ303', title: 'Intermediate Macroeconomics', image: '/images/Intermediate_Macroeconomics_img.jpg', link: '/courses/Econ303', university: 'University of New Mexico', details: { syllabus: 'https://drive.google.com/file/d/1uBQmgk6fM2AfD7cTGM6f1IuaWClrIXIX/view', schedule: 'MWF at 12:00 - 12:50 am in DSH-132', instructor: 'Dr. Mustofa Mahmud Al Mamun', office: 'ECON 2002', hours: 'Mondays and Thursdays [ 1:00 pm - 2:00 pm ]', email: 'mmamun@unm.edu', zoom: 'https://unm.zoom.us/j/9171407395', textbooks: [{description: 'Williamson, Stephen D. Macroeconomics. Sixth Edition. New York: Pearson, 2018', status: 'Required'}, {description: 'Blanchard, Olivier. Macroeconomics. Eighth edition. New York: Pearson, 2021.', status: 'Optional'}], tas: [{ name: 'Samuel Asare', office: 'Econ 2026', hours: 'Tuesdays and Thursdays [ 12:00 pm - 1:00 pm ]', email: 'samasare@unm.edu' }] }},
          { code: 'OnlineEcon2110', title: 'Macroeconomic Principles (Online)', image: '/images/Macroeconomic-Principles-img.jpg', link: '/courses/OnlineEcon2110', university: 'University of New Mexico', details: { instructor: 'Dr. Mustofa Mahmud Al Mamun', email: 'mmamun@unm.edu', zoom: 'https://unm.zoom.us/j/9171407395', hours: 'Mondays and Wednesdays (1:00 pm - 2:00 pm)', schedule: 'December 16, 2024 - January 18, 2025' }},
          { code: 'Econ321', title: 'Development Economics', image: '/images/Development-Economics-img.jpg', link: '/courses/Econ321', university: 'University of New Mexico', details: { instructor: 'Dr. Mustofa Mahmud Al Mamun', office: 'ECON 2002', hours: 'Tuesdays 11:00-1:00 am', email: 'mmamun@unm.edu', zoom: 'https://unm.zoom.us/j/9171407395', textbooks: [{description: 'Taylor, J. Edward, and Travis J. Lybbert. 2020. Essentials of Development Economics, Third Edition. 3rd ed. Berkeley, CA: University of California Press.', status: 'Required'}], tas: [{ name: 'Stephania Alarcon Alcala', office: 'Econ 1040', hours: '12:30 - 2:00 pm (Tuesday and Thursday)', email: 'stephalarcon1997@unm.edu' }] }},
          { code: 'Econ1100', title: 'Principles of Macroeconomics', image: '/images/Principles-of-Macroeconomics-Fordham-image.jpg', link: '/courses/Fordham/Econ1100', university: 'Fordham University', details: { description: 'This course will adopt a traditional approach to teaching introductory Macroeconomics. We will use real-world data to understand the topics and the current state of the economy. By the end of the semester, you will have a basic idea about the macroeconomic concepts and the US economy.', textbooks: [{description: 'Mankiw, N. Gregory. Principles of Macroeconomics, 9th ed.', status: 'Required'}] }},
          { code: 'Econ1200', title: 'Principles of Microeconomics', image: '/images/Principles-of-Microeconomics-Fordham-image.jpg', link: '/courses/Fordham/Econ1200', university: 'Fordham University', details: { description: 'This course is going to adopt a radically different approach to learning basic Microeconomics...', textbooks: [{description: 'Mankiw, N. Gregory. Principles of Microeconomics, 8th ed.', status: 'Required'}] }}
        ]);
        console.log("Initial courses seeded.");
    }

  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    registerRoutes();
  }
}

function registerRoutes() {
  const db = client.db("Mustofa_Mamun_DB");
  const fileCollection = db.collection("files");
  const courseCollection = db.collection("courses");
  const profileCollection = db.collection("profile");
  const researchCollection = db.collection("research");

  // Root
  app.get("/", (req, res) => res.send("Welcome to Mustofa Server"));

  // Login
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(400).send({ message: "Invalid credentials" });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send({ message: "Invalid credentials" });
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.send({ message: "Login successful", token });
  });

  // Course Routes
  app.get("/courses", async (req, res) => {
    try {
      const courses = await courseCollection.find({}).toArray();
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

  // File Routes
  app.get("/files", async (req, res) => {
    try {
      const files = await fileCollection.find(req.query).toArray();
      res.send(files);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch files", error });
    }
  });

  app.post("/files", authenticate, upload.single('file'), async (req, res) => {
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
      res.status(500).send({ message: "Failed to add file", error: error.message });
    }
  });

  app.put("/files/:id", authenticate, upload.single('file'), async (req, res) => {
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

  app.delete("/files/:id", authenticate, async (req, res) => {
    try {
      const result = await fileCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to delete file", error });
    }
  });

  // Profile Routes
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
      const result = await profileCollection.updateOne({}, { $set: req.body });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "Failed to update profile", error });
    }
  });

  // Research Routes
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

initialize().then(() => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
});
