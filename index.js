const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g9xsrko.mongodb.net/?retryWrites=true&w=majority`;

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

    const usersCollection = client.db("pollDb").collection("users");
    const imagesCollection = client.db("pollDb").collection("images")
    const votesCollection = client.db("pollDb").collection("votes");

    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // votes api

    app.get('/votes', async (req, res) => {
      // console.log('inside verify token',req.headers);
      const result = await votesCollection.find().toArray();
      res.send(result);
    });

    // Inside your backend voting endpoint
    app.post('/votes', async (req, res) => {
      const { imageId, userEmail, imageTitle } = req.body;
    
      try {
        // Check if the user has already voted for this image
        const existingVote = await votesCollection.findOne({ imageId, userEmail, imageTitle });
        if (existingVote) {
          return res.status(400).json({ message: 'User has already voted for this image.' });
        }
    
        // Check the number of images the user has voted for
        const userVoteCount = await votesCollection.countDocuments({ userEmail });
        if (userVoteCount >= 5) {
          return res.status(400).json({ message: 'User has reached the maximum limit of votes.' });
        }
    
        // If not, save the new vote
        await votesCollection.insertOne({ imageId, userEmail, imageTitle });
    
        res.status(201).json({ message: 'Vote recorded successfully.' });
      } catch (error) {
        console.error('Error recording vote:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
    


    // images related api

    app.get('/images', async (req, res) => {
      // console.log('inside verify token',req.headers);
      const result = await imagesCollection.find().toArray();
      res.send(result);
    });

    app.post('/images', async (req, res) => {
      const image = req.body;
      const result = await imagesCollection.insertOne(image);
      res.send(result);
    })



    app.get('/images/:imageId', async (req, res) => {
      const id = req.params.imageId; // Fix the parameter name here
      const query = { _id: new ObjectId(id) };
      const result = await imagesCollection.findOne(query);
      res.send(result);
    });

    // users related api

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);

    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    // Add this route to check if a user is an admin
    app.get('/users/admin/:email', async (req, res) => {
      const userEmail = req.params.email;
      const user = await usersCollection.findOne({ email: userEmail });

      if (user && user.role === 'admin') {
        res.json({ admin: true });
      } else {
        res.json({ admin: false });
      }
    });

    app.get('/users', async (req, res) => {
      // console.log('inside verify token',req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
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



app.get('/', (req, res) => {
  res.send('Poll management')
})

app.listen(port, () => {
  console.log(`Poll management: ${port}`);
})