const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",  // Allow local frontend
      "https://job-portal-bb2fa.web.app"  // Allow deployed frontend
    ],
    methods:["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const allowedOrigins = [
  "http://localhost:5173",  // Local development
  "https://job-portal-bb2fa.web.app"  // Deployed frontend
];

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies and authentication headers
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k3e8u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const db = client.db("TaskPilot");
    const usersCollection = db.collection("users");
    const tasksCollection = db.collection("tasks");

    // Socket.io connection handling
    io.on("connection", (socket) => {
      console.log("Client connected");
      
      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });

    // Users endpoints
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const userData = req.body;
      try {
        const existingUser = await usersCollection.findOne({ uid: userData.uid });
        if (existingUser) {
          return res.status(200).send({ message: "User already exists", user: existingUser });
        }
        const result = await usersCollection.insertOne(userData);
        res.status(201).send({ message: "User created successfully", result });
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send({ message: "Failed to save user", error: error.message });
      }
    });

    //! Tasks endpoints
    
   // In your existing `run` function, update the tasks endpoints:

// GET /tasks - Sort by position
app.get("/tasks", async (req, res) => {
    try {
      const tasks = await tasksCollection.find().sort({ position: 1 }).toArray();
      res.status(200).send(tasks);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch tasks", error: error.message });
    }
  });
  
  // POST /tasks - Add initial position
  app.post("/tasks", async (req, res) => {
    try {
      const task = {
        ...req.body,
        timestamp: new Date(),
        position: req.body.position || 0, // Default to 0 if not provided
      };
      const result = await tasksCollection.insertOne(task);
      const newTask = await tasksCollection.findOne({ _id: result.insertedId });
      io.emit("taskCreated", newTask);
      res.status(201).send(newTask);
    } catch (error) {
      res.status(500).send({ message: "Failed to create task", error: error.message });
    }
  });
  
  // PUT /tasks/:id - Update position along with category
  app.put("/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body; // Includes category and position
  
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Task not found" });
      }
  
      const updatedTask = await tasksCollection.findOne({ _id: new ObjectId(id) });
      io.emit("taskUpdated", updatedTask);
      res.status(200).send(updatedTask);
    } catch (error) {
      res.status(500).send({ message: "Failed to update task", error: error.message });
    }
  });

    app.delete("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Task not found" });
        }
        
        io.emit("taskDeleted", id);
        res.status(200).send({ message: "Task deleted successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete task", error: error.message });
      }
    });

    

    // Ping MongoDB to confirm connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the TaskPilot API!");
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});