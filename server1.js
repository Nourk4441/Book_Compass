const express= require('express');
const path= require('path');
const connection = require('./Data/dbConnection');
require('./Data/dbConnection');
const multer = require('multer');
const fileUpload = require('express-fileupload');
const pdf =require('pdf-parse');
const fs = require('fs');
const axios = require('axios'); // for making HTTP requests
const session = require('express-session');
const crypto = require('crypto');

const secretKey = crypto.randomBytes(64).toString('hex');
const PORT = process.env.PORT || 4500;
const app = express();

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(express.urlencoded({extended: true})); 
app.use(express.json());
app.set('views',path.join(__dirname,'public/views'));
app.use(express.static(path.join(__dirname ,'public')))
app.set('view engine', 'ejs');
app.use(express.static('public'));
let intPath=path.join(__dirname,'public\\views');
app.use(express.static(intPath));
app.use('/static',express.static('./static/'))
app.use('/assets',express.static(path.join(__dirname,'assets')))
app.use(fileUpload());


app.get('/',(req,res)=>{
    const user = req.session.user;
    console.log('Session User welcome:', user); // Add this line to debug
    res.render('welcome', { user });
})

app.get('/login',(req,res)=>{
    res.sendFile(path.join(intPath,'login.html'))
})

app.get('/register',(req,res)=>{
    res.sendFile(path.join(intPath,'signup.html'))
})

const generateRandomUserId = () => {
  return crypto.randomBytes(16).toString('hex');
};

app.post('/register-user',(req,res)=>{
    const {name,email,password}=req.body;

    if(!name.length || !email.length || !password.length){
        res.json('fill all fields')
    }else{
      const userId = generateRandomUserId();
        connection.query(`INSERT INTO userAuth (user_id,name,email,password) VALUES(?,?,?,?);`,[userId,name,email,password],function(err,result){
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.json('email already exists');
            } else {
                res.status(500).json('Error occurred');
            }
        } else {
            req.session.user = { email, userId, name };
            res.json({ name, email, user_id: userId });

            // Call recommendation endpoint with the user_id
            axios.post('http://localhost:5000/recommend-register/', { user_id: userId })
                .then(response => {
                    console.log(response.data);
                })
                .catch(error => {
                    console.error('Error while fetching recommendations:', error);
                });
        }
    }
);
}
});

app.post('/login-user', (req, res) => {
  const { email, password } = req.body;

  if (!email.length || !password.length) {
      res.json('fill all fields')
  } else {
      // Authentication part
      connection.query(`SELECT * FROM userAuth WHERE email=? and password=?;`, [email, password], function (err, result) {
          if (err) {
              console.error(err.message);
              res.status(500).json('Error occurred');
          }
          if (result.length) {
              // Send authentication result
              const user = result[0];
              if (user) {
                req.session.user = {
                  email: user.email,
                  userId: user.id,
                  name: user.name,
                  age: user.age,
                  country: user.country,
                  nickname: user.name
                };
              res.json(user);

              axios.post('http://localhost:5000/recommend-login/', { user_id: user.user_id })
                  .then(response => {
                      console.log(response.data);
                  })
                  .catch(error => {
                      console.error('Error while fetching recommendations:', error);
                  });
          } else {
              res.json('email or password is not correct');
          }
      }});
  }
});

app.get('/profile',(req,res)=>{
  if (req.session.user) {
    res.render('profile1', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});


app.get('/pdftotext',(req,res)=>{
    res.render('uploadepage',{data:''})
})

app.post('/extracttextfrompdf',(req,res)=>{
  if(!req.files && req.files.pdfFile){
    res.status(400);
    res.end();
  }
  pdf(req.files.pdfFile).then(result=>{
    res.send(result.text)
  })
})


app.listen(PORT,()=>console.log(`Server is running on ${PORT}`));


