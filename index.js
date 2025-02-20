const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k3e8u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
        // Connect to MongoDB (keep the connection open)
        await client.connect();
        const usersCollection = client.db("TaskPilot").collection("users");

        // ! --------------------------- USERS ---------------------------

        app.get("/users", async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.post("/users", async (req, res) => {
            const userData = req.body; // Get user data from the request body
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









        





        // Ping MongoDB to confirm connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
    // Note: We no longer close the client here to keep the connection alive
}
run().catch(console.dir);

// Routes
app.get("/", (req, res) => {
    res.send("Welcome to the server!");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});