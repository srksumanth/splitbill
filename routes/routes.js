const express = require('express');
const path = require('path');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user.js');
const Bill = require('../models/bill.js');
const router = express.Router();
const jwtSecret = 'teamv8';
const bcrypt = require('bcrypt');
const flash  = require("connect-flash");
const crypto = require('crypto');
const mgunKey = "key";
const domain = "mailgun domain"
const mailgun = require("mailgun-js")({apiKey:mgunKey,domain});
const Auth = function(req,res,next){
    if(req.isAuthenticated()){
        next();
    }
    else{
        res.redirect('/signin');
    }
}
router.get('/',Auth,(req,res)=>{
    res.sendFile(path.join(__dirname,'../public/index.html'));
})

router.get('/signin',(req,res)=>{
    if(req.isAuthenticated()){
        res.redirect('/');
    }
    else{
        res.locals.errors = req.flash('error');
        res.render('signin')
    }
    
});
router.get('/signup',(req,res)=>{
    if(req.isAuthenticated()){
        res.redirect('/');
    }
    else{
        res.locals.errors = req.flash('error');
        res.render('signup')
    }
    
});
router.post('/signup',(req,res,next)=>{
    if(req.isAuthenticated()){
        return res.redirect('/');
    }
    let {email,password,displayName} = req.body;
    User.findOne({email},(err,user)=>{
        if(err)
        console.log(err);
        if(!user){
            // signup the user
            let newUser = new User({
                email,
                password,
                displayName
            });
            newUser.save((err,user)=>{
                if(err) throw err;
                next()
            })
        }
        else{
            req.flash('error','A user with this email already exists')
            res.redirect('/signup');
        }
        
    })
},passport.authenticate('login',{
    successRedirect:'/',
    failureRedirect:'/signup',
    failureFlash:true
}));

router.post('/signin',passport.authenticate('login',{
    successRedirect:'/',
    failureRedirect:'/signin',
    failureFlash:true
    })
)

// google oauth
router.get('/auth/google',
passport.authenticate('google', { scope: 
    ['https://www.googleapis.com/auth/plus.profile.emails.read' ] }
));

router.get( '/auth/google/callback', 
  passport.authenticate( 'google', { 
      successRedirect: '/',
      failureRedirect: '/signup'
}));

// facebook oauth
router.get('/auth/facebook',
passport.authenticate('facebook',{authType:'rerequest'}));

router.get('/auth/facebook/callback',
passport.authenticate('facebook', { failureRedirect: '/signup' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/');
});
// logout
router.get('/logout',(req,res)=>{
    if(req.isAuthenticated()){
        req.logout();
        res.redirect('/')
    }
    else{
        res.redirect('/signin')
    }
})
router.get('/test',(req,res)=>{
    console.log(req.user);
    res.json('ok')
})
// forgot password
router.get('/forgot-password',(req,res)=>{
    // res.locals.errors = req.flash('error');
    if(req.isAuthenticated()){
        res.redirect('/')
    }
    else{
        res.render('forgot-password')
    }
}) 
router.post('/forgot-password',(req,res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
    let {email} = req.body;
    User.findOne({email},(err,user)=>{
        if(err) console.log(err)
        if(!user){
            return res.json({
                success:false,
                message:'Incorrect email'
            })
        }
        else{
            crypto.randomBytes(10,(err,buffer)=>{
                if(err) console.log(err);
                let randomStr = buffer.toString('hex');
                user.resetStr = randomStr;
                user.expires = Date.now() + 500000;
                user.save(err=>{
                    if(err) console.log(err);
                    const data = {
                        from: 'splitbill <me@samples.mailgun.org>',
                        to: email,
                        subject: 'splitbill - password reset link', 
                        html: `
                        <p>Hello ${user.displayName} , here is the password reset link</p>
                        <a href="http://localhost:3000/reset-password/${randomStr}">
                        http://localhost:3000/reset-password/${randomStr}
                        </a>
                        `
                      };
                      mailgun.messages().send(data, function (error, body) {
                          if(error) throw error
                          else{
                        console.log(body);
                        res.json({
                            success:true,
                            message:`A password reset link is sent to ${email}`
                        })
                        }
                      });
                })
                
            })
        }
    })
})
router.get('/reset-password/:resetStr',(req,res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
    let {resetStr} = req.params;
    if(resetStr.length < 8){
        return res.json({
            success:false,
            message:'bad request'
        })
    }
    User.findOne({resetStr},(err,user)=>{
        if(err) console.log(err);
        if(!user){
            res.json({
                success:false,
                message:'Invalid link'
            })
        }
        else{
            if(user.expires < Date.now()){
               return res.json({
                    success:false,
                    message:'Link expired!'
                })
            }
            else{
                res.render('reset-password');
            }
        }

    })
})
router.post('/reset-password/:resetStr',(req,res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
    let {resetStr} = req.params;
    if(resetStr.length < 8){
        return res.json({
            success:false,
            message:'bad request'
        })
    }
    User.findOne({resetStr},(err,user)=>{
        let {password} = req.body;
        if(err) console.log(err);
        if(!user){
            res.json({
                success:false,
                message:'Invalid link'
            })
        }
        else{
            if(user.expires < Date.now()){
               return res.json({
                    success:false,
                    message:'Link expired!'
                })
            }
            else{
                user.password = password;
                user.resetStr = null;
                user.save(err=>{
                    res.json({
                        success:true,
                        message:'password updated successfully'
                    })
                })
            }
        }
    })
})
router.get('/test1',(req,res)=>{
    res.render('reset-password')
})
module.exports = router;

