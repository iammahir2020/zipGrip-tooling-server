const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

// const corsConfig = {
//   origin: "*",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
// };
// app.use(cors(corsConfig));

// app.options("*", cors(corsConfig));
// app.use(express.json());
// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept,authorization"
//   );
//   next();
// });

app.use(cors({ origin: "https://zipgrip-tooling.web.app/" }));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fnswm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWTToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send([{ message: "Unauthorized Access" }]);
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send([{ message: "Forbidden Access" }]);
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("zipGrip-tooling").collection("users");
    const reviewsCollection = client
      .db("zipGrip-tooling")
      .collection("reviews");
    const productsCollection = client
      .db("zipGrip-tooling")
      .collection("products");
    const ordersCollection = client.db("zipGrip-tooling").collection("orders");
    const paymentsCollection = client
      .db("zipGrip-tooling")
      .collection("payments");

    app.get("/payment", async (req, res) => {
      const payments = await paymentsCollection.find().toArray();
      res.send(payments);
    });

    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "1d",
        }
      );
      res.send({ result, token });
    });

    app.delete("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/user/admin/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { position: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send({ result });
    });

    app.get("/admin/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      if (user.position === "admin") {
        res.send({ admin: true });
      } else {
        res.send({ admin: false });
      }
    });

    app.get("/profile/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    app.put("/profile/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const userProfile = req.body;
      // console.log(userProfile);
      const filter = { email: email };
      const updateDoc = {
        $set: {
          name: userProfile.name,
          institution: userProfile.institution,
          address: userProfile.address,
          number: userProfile.number,
          linkedIn: userProfile.linkedIn,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send({ result });
    });

    app.put("/profilePicture/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const userProfile = req.body;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          profilePicture: userProfile.profilePicture,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send({ result });
    });

    app.get("/review", async (req, res) => {
      const result = await reviewsCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    app.post("/review", verifyJWTToken, async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    app.get("/product", verifyJWTToken, async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    app.get("/product/singleProduct/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    app.get("/product/:page", async (req, res) => {
      const page = req.params.page;
      if (page === "home") {
        const result = await productsCollection.find().limit(4).toArray();
        res.send(result);
      }
    });

    app.post("/product", verifyJWTToken, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.put("/product/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const remainingQuantity = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          available: remainingQuantity.remainingQuantity,
        },
      };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send({ result });
    });

    app.delete("/product/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/order", verifyJWTToken, async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/order", verifyJWTToken, async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.send(result);
    });

    app.get("/order/:email", verifyJWTToken, async (req, res) => {
      const email = req.params.email;
      const query = { customerEmail: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/order/payment/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    app.delete("/order/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/order/:id", verifyJWTToken, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      console.log(payment.status);
      const filter = { _id: ObjectId(id) };
      let updateDoc = {};
      if (payment.status === "Paid") {
        updateDoc = {
          $set: {
            status: "Pending",
            transactionId: payment.transactionId,
          },
        };
      } else {
        updateDoc = {
          $set: {
            status: "Shipped",
            transactionId: payment.transactionId,
          },
        };
      }
      const result = await paymentsCollection.insertOne(payment);
      const updatedBooking = await ordersCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updateDoc);
    });

    app.post("/create-payment-intent", verifyJWTToken, async (req, res) => {
      const order = req.body;
      const amountToBePaid = order.amountToBePaid;
      const amount = parseFloat(amountToBePaid) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ZipGrip Tooling Server is LIVE!");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
