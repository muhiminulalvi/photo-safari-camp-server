/*
===================================================
            Starting Point
===================================================
*/
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

/*
===================================================
            Middleware
===================================================
*/

app.use(express.json())
app.use(cors())

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
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const instructorCollection = client.db("photoSafari").collection("instructors");
    const classCollection = client.db("photoSafari").collection("classes");
    const cartCollection = client.db("photoSafari").collection("carts");

    // instructors data
    app.get('/instructors', async(req,res)=>{
        const result = await instructorCollection.find().toArray()
        res.send(result)
    })

    // classes data
    app.get('/classes', async(req,res)=>{
        const result = await classCollection.find().toArray()
        res.send(result)
    })

    /*
===================================================
            Get Cart Api
===================================================
*/
    app.get('/carts', async(req,res)=> {
      const email = req.query.email
      if(!email){
        res.send([])
      }
      const query = {email: email}
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    /*
===================================================
            Store Cart Info
===================================================
*/
    app.post('/carts', async(req,res)=> {
      const course = req.body
      console.log(course);
      const result = await cartCollection.insertOne(course)
      res.send(result)
    })

    /*
===================================================
            Delete Cart Item
===================================================
*/
    app.delete('/carts/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })
    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('The server is running')
})

app.listen(port, ()=>{
    console.log(`The server is running on port ${port}`);
})
