const express = require("express");
const app = express();
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zedvr4o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Collection for all file types
    const fileCollection = client.db("Mustofa_Mamun_DB").collection("files");
    const userCollection = client.db("Mustofa_Mamun_DB").collection("users");

    // Add a user (for demonstration purposes, you should hash the password in a real application)
    const user = {
      email: process.env.USER_EMAIL,
      password: await bcrypt.hash(process.env.USER_PASSWORD, 10),
    };
    await userCollection.insertOne(user);

    // Login Endpoint
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(400).send({ message: "Invalid email or password." });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).send({ message: "Invalid email or password." });
      }
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.send({ message: "Login successful", token });
    });

    // Generic Add Endpoint
    app.post("/files", async (req, res) => {
      const { type, title, link, course } = req.body;
      if (!type || !title || !link || !course) {
        return res.status(400).send({ message: "All fields are required." });
      }
      try {
        const result = await fileCollection.insertOne({ type, title, link, course });
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add file", error });
      }
    });

    // Generic Fetch Endpoint
    app.get("/files", async (req, res) => {
      const { type, course } = req.query;
      const filter = {};
      if (type) filter.type = type;
      if (course) filter.course = course;
      try {
        const files = await fileCollection.find(filter).toArray();
        res.send(files);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch files", error });
      }
    });

    // Generic Update Endpoint
    app.put("/files/:id", async (req, res) => {
      const { id } = req.params;
      const { type, title, link, course } = req.body;
      if (!type || !title || !link || !course) {
        return res.status(400).send({ message: "All fields are required." });
      }
      try {
        const result = await fileCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { type, title, link, course } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update file", error });
      }
    });

    // Generic Delete Endpoint
    app.delete("/files/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await fileCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete file", error });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});