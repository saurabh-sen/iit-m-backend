const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { authenticateRole } = require("./middleware/authenticateRole");

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// signup route
app.post("/signup", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("users");
    // check if username is already present
    const result1 = await myColl.findOne({ username: username });
    if (result1) {
      res.status(409).json({ status: 409, message: "Username already exists" });
      return;
    }
    const doc = { username: username, password: password, role: role };
    const result = await myColl.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
    res.status(201).json({ status: 201, message: "User created" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// login route
app.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("users");
    // find the user with the username
    const result = await myColl.findOne({
      username: username,
      password: password,
      role: role,
    });
    // if user is not found
    if (!result) {
      res.status(401).json({ status: 401, message: "User not found" });
      return;
    }
    // send the JWT token
    const accessToken = jwt.sign(
      { username: username, role: role },
      process.env.JWT_SECRET
    );
    const data = await myColl.updateOne(
      { username: username },
      { $set: { accessToken: accessToken } }
    );
    if (data.acknowledged === false) {
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
    res.status(200).json({
      status: 200,
      message: "Login successful",
      accessToken: accessToken,
      role: role,
      username: username,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// add book route
app.post("/addbook", authenticateRole, async (req, res) => {
  try {
    const { bookId, bookName } = req.body;
    const { role } = req.user;
    if (role !== "librarian")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("books");
    const doc = { bookId: bookId, bookName: bookName, bookStatus: "AVAILABLE" };
    const result = await myColl.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
    res.status(201).json({ status: 201, message: "Book added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// librarian dashboard data
app.get("/librarian", authenticateRole, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "librarian")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("books");
    const myColltMembers = myDB.collection("users");
    const result = await myColl.find({}).toArray();
    let resultMembers = await myColltMembers.find({}).toArray();

    return res.status(200).json({
      status: 200,
      message: "Success",
      books: result,
      members: resultMembers,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
});

// update book route
app.put("/updatebook", authenticateRole, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "librarian")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    let { bookName, bookId, bookStatus, bookUniqueId } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("books");
    if (bookStatus === true) {
      bookStatus = "AVAILABLE";
    } else {
      bookStatus = "UNAVAILABLE";
    }
    const result = await myColl.updateOne(
      { _id: new ObjectId(bookUniqueId) },
      {
        $set: {
          bookId: bookId,
          bookName: bookName,
          bookStatus: bookStatus,
        },
      }
    );
    if (result.modifiedCount === 0) {
      res.status(404).json({ status: 404, message: "Book not found" });
      return;
    }
    res.status(200).json({ status: 200, message: "Book updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// delete book route
app.delete("/deletebook", authenticateRole, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "librarian")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const { bookId } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("books");
    const result = await myColl.deleteOne({ bookId: bookId });
    if (result.deletedCount === 0) {
      res.status(404).json({ status: 404, message: "Book not found" });
      return;
    }
    res.status(200).json({ status: 200, message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// add member route
app.post("/addmember", authenticateRole, async (req, res) => {
  try {
    let { membersUsername, membersPassword } = req.body;
    const { role } = req.user;
    if (role !== "librarian")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("users");

    // check if username is already present
    const result = await myColl.findOne({ username: membersUsername });
    if (result) {
      res.status(409).json({ status: 409, message: "Username already exists" });
      return;
    }
    const result1 = await myColl.insertOne({
      username: membersUsername,
      password: membersPassword,
      role: "member",
    });
    console.log(`A document was inserted with the _id: ${result1.insertedId}`);
    res.status(201).json({ status: 201, message: "member added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// update book route
app.put("/updatemembers", authenticateRole, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "librarian")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    let { membersUsername, membersPassword, membersId } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("users");
    let updatedData = {
      username: membersUsername,
      password: membersPassword,
    };

    const result = await myColl.updateOne(
      { _id: new ObjectId(membersId) },
      { $set: updatedData }
    );
    console.log(result);
    if (result.modifiedCount === 0) {
      res.status(404).json({ status: 404, message: "Book not found" });
      return;
    }
    res.status(200).json({ status: 200, message: "Book updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// delete book route
app.delete("/deletemember", authenticateRole, async (req, res) => {
  try {
    const { membersId } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("users");
    const result = await myColl.deleteOne({ _id: new ObjectId(membersId) });
    if (result.deletedCount === 0) {
      res.status(404).json({ status: 404, message: "Member not found" });
      return;
    }
    res.status(200).json({ status: 200, message: "Member deleted" });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// MEMBERS ROUTES

// member dashboard data
app.get("/member", authenticateRole, async (req, res) => {
  try {
    const { role, username } = req.user;
    if (role !== "member")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const myDB = client.db("IIT-M");
    const myCollUsers = myDB.collection("users");
    const result1 = await myCollUsers.findOne({ username: username });
    if(!result1) {
      return res.status(404).json({ status: 404, message: "Member not found" });
    }
    const myColl = myDB.collection("books");
    const result = await myColl.find({}).toArray();
    return res.status(200).json({
      status: 200,
      message: "Success",
      books: result,
      members: result1,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
});

// borrow book route
app.put("/borrowBook", authenticateRole, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "member")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const { bookId } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("books");
    const result = await myColl.updateOne(
      { bookId: bookId },
      { $set: { bookStatus: "UNAVAILABLE" } }
    );
    if (result.modifiedCount === 0) {
      res.status(404).json({ status: 404, message: "Book not found" });
      return;
    }
    res.status(200).json({ status: 200, message: "Book borrowed" });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

// return book route
app.put("/returnBook", authenticateRole, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "member")
      return res
        .status(403)
        .json({ status: 403, message: "Forbidden", role: role });
    const { bookId } = req.body;
    const myDB = client.db("IIT-M");
    const myColl = myDB.collection("books");
    const result = await myColl.updateOne(
      { bookId: bookId },
      { $set: { bookStatus: "AVAILABLE" } }
    );
    if (result.modifiedCount === 0) {
      res.status(404).json({ status: 404, message: "Book not found" });
      return;
    }
    res.status(200).json({ status: 200, message: "Book returned" });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = { client };
