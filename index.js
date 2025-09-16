const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.lb51cqq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const userCollection = client.db("Red-Hope-DB").collection("allUsers");

    app.get("/allUser", async (req, res) => {
      try {
        const cursor = userCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching users");
      }
    });

    // auth related
    app.post("/signup", async (req, res) => {
      try {
        console.log(req.body);
        const { firstName, lastName, email, password, phone, terms, photo } =
          req.body;

        const existingUser = await userCollection.findOne({ email });
        if (existingUser) return res.status(400).send("Email already exists");

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
          firstName,
          lastName,
          email,
          phone,
          photo,
          password: hashedPassword,
          terms,
          role: "user",
          createdAt: new Date(),
        };

        const result = await userCollection.insertOne(newUser);

        // remove password before sending
        const userToSend = { ...newUser };
        delete userToSend.password;
        userToSend._id = result.insertedId;

        res.status(200).json({
          success: true,
          message: "Sign Up successful",
          user: userToSend,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
      }
    });
    

    // social-login
    app.post("/social-login", async (req, res) => {
      const { firstName, lastName, email, phone,photo, terms, provider } = req.body;
      let user = await userCollection.findOne({ email });

      if (!user) {
        const newUser = {
          firstName,
          lastName,
          email,
          provider,
          terms,
          phone,
          photo,
          role: "user",
          createdAt: new Date(),
        };
        const result = await userCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }
      res.json({
        message: `Logged in with ${provider}`,
        user,
      });
    });

    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await userCollection.findOne({ email });
        if (!user) return res.status(400).send("Invalid email");
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send("Invalid password");
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
          success: true,
          message: "Login successful",
          user: userWithoutPassword,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world is template server");
});

app.listen(port, () => {
  console.log(`This server is runing on port no: ${port}`);
});
