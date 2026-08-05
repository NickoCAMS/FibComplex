const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV !== "production"
      ? false
      : { rejectUnauthorized: false },
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from values");

  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;

  const parsedIndex = parseInt(index, 10);

  if (isNaN(parsedIndex)) {
    return res.status(422).send("Un indice numerico è obbligatorio");
  }

  if (parsedIndex > 40) {
    return res.status(422).send("Index too high");
  }

  redisClient.hset("values", parsedIndex, "Nothing yet!");
  redisPublisher.publish("insert", parsedIndex);

  try {
    await pgClient.query("INSERT INTO values(number) VALUES($1)", [
      parsedIndex,
    ]);
    res.send({ working: true });
  } catch (err) {
    console.error("Errore durante l inserimento in Postgres:", err);
    res.status(500).send("Errore interno del server");
  }
});

app.listen(5000, (err) => {
  console.log("Listening");
});
