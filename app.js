// jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

// Middleware
app.use(express.static(__dirname + '/public/'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Database connections

// Database connections using environment variables
const userDBLink = process.env.USER_DB_LINK;
const blogDBLink = process.env.BLOG_DB_LINK;


const userDB = mongoose.createConnection(userDBLink, { useNewUrlParser: true, useUnifiedTopology: true });
const blogDB = mongoose.createConnection(blogDBLink, { useNewUrlParser: true, useUnifiedTopology: true });

// User schema and model for authentication
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
const User = userDB.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Post schema and model for blogs
const postSchema = {
    title: String,
    content: String
};

const Post = blogDB.model("Post", postSchema);

// Content for various pages
const homeStartingContent = `Welcome to Your Creative Haven! Dive into a world where your thoughts flow freely—no sign-ins, no barriers. Whether you're a seasoned writer or just have something on your mind, our platform lets you share your ideas effortlessly. Just start writing and let your words reach the world! Click on read more.. to read full post`;
const aboutContent = `At Read and Write, we believe in the power of storytelling...`;
const contactContent = "Our contact page is the best way to get in touch with us...";

// Routes

// Home Page - General Overview
app.get("/", (req, res) => {
    res.render("home", { homeStartingContent });
});

// About Page
app.get("/blog/about", (req, res) => {
    res.render("blog/about", { aboutContent });
});

// Contact Page
app.get("/blog/contact", (req, res) => {
    res.render("blog/contact", { contactContent });
});

// Blog Routes
app.get("/blog", (req, res) => {
    Post.find({}, (err, posts) => {
        if (err) {
            console.log(err);
        } else {
            res.render("blog/home", {
                startingContent: homeStartingContent,
                posts
            });
        }
    });
});

app.get("/blog/compose", (req, res) => {
    res.render("blog/compose");
});

app.post("/blog/compose", (req, res) => {
    const post = new Post({
        title: req.body.postTitle,
        content: req.body.postBody
    });

    post.save(err => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/blog");
        }
    });
});

app.get("/blog/posts/:postId", (req, res) => {
    const requestedPostId = req.params.postId;

    Post.findOne({ _id: requestedPostId }, (err, post) => {
        if (err) {
            console.log(err);
        } else {
            res.render("blog/post", {
                postTitle: post.title,
                postBody: post.content
            });
        }
    });
});

// Authentication Routes
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, err => {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/logout", (req, res) => {
    req.logout(err => {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});

// Secrets Feature
app.get("/secrets", (req, res) => {
    User.find({ "secret": { $ne: null } }, (err, foundUsers) => {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets", { userWithSecrets: foundUsers });
        }
    });
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
            }
        }
    });
});

// Server setup
const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log("Server started on port " + port);
});
