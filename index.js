require("dotenv").config();
const { isUrl } = require("check-valid-url");
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("node:dns");
const URL = require("url").URL;

// address: "2606:2800:21f:cb07:6820:80da:af6b:8b2c" family: IPv6

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

const { Pool } = require("pg");

const pool = new Pool({
  user: "amjad",
  password: "123",
  host: "localhost",
  port: 5432,
  database: "shorturl",
});

const connectToDatabase = async () => {
  await pool.connect();
  console.log("Connected to Postgres database");
  handleAPIs();
  listenToServer();
};

const handleAPIs = () => {
  // Your first API endpoint
  app.get("/api/hello", function (req, res) {
    res.json({ greeting: "hello API" });
  });

  app.get("/api/shorturl/:urlid", async function (req, res) {
    const urlid = req.params.urlid;

    if (!urlid) {
      res.json({ error: "Invalid url" });
      return;
    }

    const query = "SELECT long_url FROM short_long_urlmapping WHERE url_id=$1";

    const result = await pool.query(query, [`${urlid}`]);

    const idExists = result.rows.length;

    if (idExists) {
      const originalURL = result.rows[0].long_url;
      res.redirect(`${originalURL}`);
    } else {
      res.json({ error: "No short URL found for the given input" });
    }
  });

  app.post("/api/shorturl", async function (req, res) {
    let originalURL = req.body.url;

    if (!originalURL) {
      res.json({ error: "Invalid url" });
      return;
    }

    const slashAtEndRegex = /\/$/;
    originalURL = originalURL.replace(slashAtEndRegex, "");
    const httpRegex = /^https?\:\/\//;
    const isValidHTTPFormat = httpRegex.test(originalURL);

    if (!isValidHTTPFormat) {
      res.json({ error: "Invalid url" });
      return;
    }

    let domain = new URL(originalURL);
    let hostname = domain.hostname;

    dns.lookup(`${hostname}`, async function (err, addresses, family) {
      const hostnameExists = addresses;

      if (!hostnameExists) {
        res.json({ error: "Invalid hostname" });
      }

      selectQuery = `SELECT url_id FROM short_long_urlmapping WHERE long_url=$1`;

      const result = await pool.query(selectQuery, [`${originalURL}`]);

      idExists = result.rows.length;

      if (idExists) {
        const urlID = Number(result.rows[0].url_id);
        res.json({ original_url: `${originalURL}`, short_url: urlID });
      } else {
        const urlID = Math.floor(Math.random() * (1000000 - 1)) + 1;

        insertQuery = `INSERT INTO short_long_urlmapping(url_id,long_url) VALUES($1,$2)`;

        await pool.query(insertQuery, [`${urlID}`, `${originalURL}`]);

        res.json({ original_url: `${originalURL}`, short_url: urlID });
      }
    });
  });
};

const listenToServer = () => {
  app.listen(port, function () {
    console.log(`Listening on port ${port}`);
  });
};

connectToDatabase();
