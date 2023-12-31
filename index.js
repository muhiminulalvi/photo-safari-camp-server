/*
===================================================
            Starting Point
===================================================
*/
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

/*
===================================================
            Middleware
===================================================
*/

app.use(express.json());
app.use(cors());

/*
===================================================
            MongoDB
===================================================
*/

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kkbgyge.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verification
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log("Authorization = ", authorization);
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: "forbidden access" });
    }
    req.decoded = decoded;
    // console.log({ decoded });
    next();
  });

  // });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // const instructorCollection = client
    //   .db("photoSafari")
    //   .collection("instructors");
    const classCollection = client.db("photoSafari").collection("classes");
    const cartCollection = client.db("photoSafari").collection("carts");
    const userCollection = client.db("photoSafari").collection("users");
    const paymentCollection = client.db("photoSafari").collection("payments");

    /*
===================================================
            JWT
===================================================
*/

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      // console.log(token);
      res.json({ token });
    });

    /*
===================================================
            User Related API
===================================================
*/

    // secure all user
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const oldUser = await userCollection.findOne(query);
      if (oldUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // admin verify
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // instructor verify
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // instructors data
    // app.get("/instructors", async (req, res) => {
    //   const result = await instructorCollection.find().toArray();
    //   res.send(result);
    // });
    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const instructors = await userCollection.find(query).toArray();
      res.send(instructors);
    });

    /*
===================================================
            Class Api
===================================================
*/

    app.get("/classes", async (req, res) => {
      const { email } = req.query;

      if (email) {
        // getting instructor's classes
        try {
          const classes = await classCollection.find({ email }).toArray();
          res.json(classes);
        } catch (error) {
          console.error("Failed to fetch instructor's classes:", error);
          res.status(500).send("Failed to fetch instructor's classes");
        }
      } else {
        // getting all classes
        try {
          const classes = await classCollection.find().toArray();
          res.json(classes);
        } catch (error) {
          console.error("Failed to fetch classes:", error);
          res.status(500).send("Failed to fetch classes");
        }
      }
    });

    // add class
    app.post("/classes", verifyJWT, async (req, res) => {
      const newCourse = req.body;
      const result = await classCollection.insertOne(newCourse);
      res.send(result);
    });

    // Update class
    app.patch("/classes/approve/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // denied class
    app.patch("/classes/denied/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // feedback from admin
    app.post("/classes/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const { feedback } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /*
===================================================
            Get Cart Api
===================================================
*/
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log('email =', email);
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      // console.log("decoded email =", decodedEmail);
      // if(email !== decodedEmail){
      //   return res.status(403).send({ error: true, message: "forbidden access" });
      // }
      if (decodedEmail !== email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      // console.log('query = ', query);
      const result = await cartCollection.find(query).toArray();
      // console.log('result = ', result);
      res.send(result);
    });

    /*
===================================================
            Store Cart Info
===================================================
*/
    app.post("/carts", verifyJWT, async (req, res) => {
      const course = req.body;
      console.log(course);
      const result = await cartCollection.insertOne(course);
      res.send(result);
    });

    /*
===================================================
            Delete Cart Item
===================================================
*/

    app.get("/carts/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.findOne(query);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const courseIds = payment.courseId;

      // Update the enrolled classes and reduce available seats
      const updateResult = await classCollection.updateMany(
        // { _id: { $in: courseIds.map((id) => new ObjectId(id)) } },
        { _id: new ObjectId(courseIds) },
        { $inc: { studentsEnrolled: 1, availableSeats: -1 } }
      );
      // Delete
      const query = {
        // _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
         _id: new ObjectId(payment.cartItems) 
         
      };
      // console.log(payment.cartItemId);
      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ insertResult, updateResult, deleteResult });
    });

    app.post("/classes/enroll", verifyJWT, async (req, res) => {
      const { courseId } = req.body;

      // Update the enrolled classes
      const updateResult = await classCollection.updateMany(
        { _id: { $in: courseId.map((id) => new ObjectId(id)) } },
        { $inc: { studentsEnrolled: 1, availableSeats: -1 } }
      );

      res.send({ updateResult });
    });

    app.get("/payments", verifyJWT, async (req, res) => {
      const payments = await paymentCollection.find().toArray();
      res.send(payments);
    });

    /*
===================================================
            Admin Dashboard
===================================================
*/
    app.get("/adminstats", async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const classData = await classCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      const payments = await paymentCollection.find().toArray();
      const revenue = payments.reduce((sum, payment) => sum + payment.price, 0);
      res.send({ users, classData, orders, revenue });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The server is running");
});

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
});
