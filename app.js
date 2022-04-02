require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const body = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const app = express();
// const encrypt = require('mongoose-encryption');
// const md5 = require("md5");
// const bcrypt = require('bcrypt')
// const saltRounds = 8;
const FacebookStrategy = require('passport-facebook').Strategy;

app.use(body.urlencoded({
  extended: true
}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
  secret: "TOP SECRET",
  saveUninitialized:false,
  resave:false,
  cookie:{},
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB');


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true
  },
  password: String,
  googleId:String,
  facebookId:String,
  secret:String
});

// userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('user', userSchema);
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user,done){
  done(null,user.id);
});

passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){

    done(err,user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get('/', function(req, res) {
  res.render('home');
})



app.get('/auth/google',passport.authenticate('google',{scope:['profile']})
)

app.get('/login', function(req, res) {
  res.render('login');

})
app.get('/register', function(req, res) {

  res.render('register')

})
app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render('submit')
  }else{
    res.redirect('/login')
  }
  })


app.post('/login', passport.authenticate('local'),function(req,res){
  // const password = md5(req.body.password);
console.log(req);

  const user = new User({
    username:req.body.username,
    password:req.body.password
  });
  req.login(user,function(err){
    if(!err){

          res.redirect('/secrets');

      }else{
      console.log(err);
      res.redirect("/login")
    }
  })
});

app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/');
})

app.get('/secrets', function(req,res){
  res.set('Cache-Control','no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  User.find({"secret":{$ne:null}}, function(err,foundSecret){
    if(err){
      res.redirect('/login')
    }else{
      if(foundSecret){
        res.render('secrets', {userWithSecrets:foundSecret})
      }
    }
  });
});

app.post('/register', function(req, res) {
  User.register({username:req.body.username}, req.body.password, function(err,user){
    if (err){
      console.log(err);
      res.redirect('register');
    }else{
      passport.authenticate('local')(req,res,function(){
        res.redirect('/secrets');
      }
    )}

  })
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));



app.get('/auth/google/secrets',passport.authenticate('google',{ failureRedirect: '/login' }), function(res,res){
  res.redirect('/secrets');
})

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
  app.post('/submit',function(req,res){
    const userSecret = req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id,function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if (foundUser){
          foundUser.secret = userSecret;
          foundUser.save(function(){
            res.redirect("/secrets")
          });
        }
      }
    })
  })

app.listen(3000, function(req, res) {
  console.log("Server is running on the 3000 port.");
})
