// Dependencies

var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsScraper";

// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {
  useMongoClient: true
});

// Routes

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "public/index.html"));
  });


app.get("/saved", function(req, res) {
    res.sendFile(path.join(__dirname, "public/savedArticles.html"));
});

// A GET route for scraping the echojs website
app.get("/scrape", function(req, res) {
  axios.get("https://www.nytimes.com/section/technology").then(function(response) {

    var $ = cheerio.load(response.data);
        let counter = 0;

    $("article").each(function(i, element) {
    
      var result = {};
      
      var storyDiv = $(this).children("div.story-body")
      result.url = storyDiv.children("a").attr("href")
      var metaDiv = storyDiv.children("a").children("div.story-meta")
      result.headline = metaDiv.children("h2").text()
      result.summary = metaDiv.children("p.summary").text();

     if (result.headline && result.url){

      db.Article.create(result)
        .then(function(dbArticle) {
          console.log(dbArticle);
          counter++;
          console.log("added " + counter + " new items")
        })

        .catch(function(err) {
          return res.json(err);
        });
      }
    });

    res.sendFile(path.join(__dirname, "public/index.html"));

  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  db.Article.find({})
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});

app.get("/articles/:id", function(req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function(dbArticle) {
      res.json(dbArticle);
    })

    .catch(function(err) {
      res.json(err);
    });
});


// Route for grabbing a specific Article by id, and update it's isSaved property
app.put("/articles/:id", function(req, res) {
  db.Article.update({ _id: req.params.id}, {$set: {isSaved: true}})

    .then(function(dbArticle) {
      res.json(dbArticle);
    })

    .catch(function(err) {
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  
  db.Note.create(req.body)
    .then(function(dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })

    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});

// route for deleting an article
  app.delete("/articles/:id", function(req, res) {
    db.Article.remove({ _id: req.params.id})

    .then(function(dbArticle) {
      res.json(dbArticle);
    })

    .catch(function(err) {
      res.json(err);
    });
});


// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});