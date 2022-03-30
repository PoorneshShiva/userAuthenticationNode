require('dotenv').config();
const express = require('express');
const body = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const app = express();
const encrypt = require('mongoose-encryption');

mongoose.connect('mongodb://localhost:27017/userDB');

app.use(body.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
console.log(process.env.SECRET);

const userSchema = new mongoose.Schema({
  email:{
    type:String,
    unique:true
  },
  password:String
});

userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]})




const User = mongoose.model('user',userSchema);


app.get('/', function(req,res){
  res.render('home')
})
app.get('/login', function(req,res){
  res.render('login')

})
app.get('/register', function(req,res){

  res.render('register')

})


app.post('/login', function(req,res){
  const email = req.body.username;
  const password = req.body.password;
  User.findOne({email:email},function(err, results){
    if(!err){
      if(results){
        if (results.password === password){
          res.render('secrets');
      }else{
        res.send('Wrong Password');
      }
    }
    }else{
      console.log(err);
      res.send(err);
    }
  })
})



app.post('/register', function(req,res){
  const email = req.body.username;
  const password = req.body.password;
  console.log(email, password);
  const user = new User({
    email:email,
    password:password
  });
  user.save(function(err){

    if (!err){
      res.render('secrets');
    }else{
      console.log(err);
    }
  });

});




app.listen(3000, function(req,res){
  console.log("Server is running on the 3000 port.");
})
