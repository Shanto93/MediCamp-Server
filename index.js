const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tuf9wrv.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("mediCampDB").collection("users");
    const popularCampCollection = client
      .db("mediCampDB")
      .collection("popularCamp");
    const reviewsCollection = client.db("mediCampDB").collection("reviews");

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log("Inside verify token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ messsage: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verify token
    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email:email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'});
      }
      next();
    }

    //Popular Medical Camp Related API
    app.get("/popularcamp", async (req, res) => {
      const result = await popularCampCollection.find().toArray();
      res.send(result);
    });

    app.get("/popularcamp/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await popularCampCollection.findOne(query);
      // console.log(result);
      res.send(result);
    });

    app.post('/popularcamp',async(req,res) => {
      const item = req.body;
      const result = await popularCampCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/popularcamp/:id',verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await popularCampCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/popularcamp/:id', async(req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          camp_name: item.camp_name, 
          photo: item.photo,
          camp_fees: item.camp_fees,
          scheduled_date: item.scheduled_date, 
          scheduled_time: item.scheduled_time, 
          venue:item.venue,
          specialized_service: item.specialized_service,
          healthcare_professionals: item.healthcare_professionals, 
          target_audience: item.target_audience, 
          details: item.details
        }
      }
      const result = await popularCampCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })

    // Users related API
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users",verifyToken, verifyAdmin, async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ messsage: "user already exists", insertedID: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id",verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id",verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // JWT related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Reviews related API

    app.post("/reviews", async (req, res) => {
      const user = req.body;
      const result = await reviewsCollection.insertOne(user);
      console.log(result);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      // const email = req.query.email;
      // const query = {email:email};
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
  res.send("Medicamp is running...");
});

app.listen(port, () => {
  console.log(`MediCamp Care is running on port ${port}`);
});
