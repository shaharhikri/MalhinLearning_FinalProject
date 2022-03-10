const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const cookieParser = require("cookie-parser");
const parseToken = require(path.join(__dirname, '../services/tokenParser'));

const genUUID = require(path.join(__dirname, '../services/uuidFactory'))
let ravendb = require(path.join(__dirname, '../dbUtils/common'));
if (process.env.RUNMODE === 'TEST'){
    ravendb = require(path.join(__dirname, '../dbUtils/commonMockup'));
}
const { User } = require('../dbUtils/modelClasses');

const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
router.use(bodyParser.json())
router.use(cookieParser());

router.get('/login', notValidateToken, (req, res) => {
    res.render('login')
})

router.get('/register', notValidateToken, (req, res) => {
    res.render('register')
})

router.post('/login', async (req, res) => {
    try {
        const foundUser = await ravendb.findUserByEmail(req.body.email);
        console.log('post /login foundUser ',foundUser)
        if( !foundUser ){
            res.status(200).json({ error : 'There\'s no such user' });
            console.log('post /login logged in failed')
        }
        else if (await bcrypt.compare(req.body.password, foundUser.salt + foundUser.hashedpassword)) {
            //logged in succeeded
            let token = genToken(foundUser);
            res.status(200).json({ token : token });
            console.log('post /login logged in succeeded')
        }
        else {
            res.status(200).json({ error : 'Password incorrect' });
            console.log('post /login logged in failed')
        }
    }
    catch (e) {
        console.log(e)
        console.log('post /login logged in failed')
    }

})

router.post('/register', async (req, res) => {
    //Check If User Exists
    let foundUser = await ravendb.findUserByEmail(req.body.email);
    if (foundUser) {
        return res.status(200).json({ error: 'Email is already in use' });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const newUser = new User(
        await genUUID(),
        req.body.name,
        req.body.email,
        salt,
        hashedPassword.substring(29),
    );
    await ravendb.storeUser(newUser);
    return res.status(200).json({ succeeded: 'succeeded' });
});

function genToken(user) {
    return jwt.sign(user.id, process.env.ACCESS_TOKEN_SECRET)  //, { expiresIn: 300})
}

//main page using this
function validateToken(req, res, next) {
    const token = parseToken(req);
    if(!token){
        res.redirect('/login');
        return;
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decriptedToken) => {
        if (err || !decriptedToken) {
            res.redirect('/login');
            return;
        }
        let userId = decriptedToken;
        console.log('validateToken',userId)
        req.user = await ravendb.findUserById(userId);
        if (!req.user) {
            res.redirect('/login');
            return;
        }
        next()
    });
}

//login/register using this
function notValidateToken(req, res, next) {

    const token = parseToken(req);
    if(!token){
        next()
        return;
    }
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decriptedToken) => {
        if (err || !decriptedToken) {
            next()
            return;
        }
        let userId = decriptedToken;
        console.log('notValidateToken',userId)
        req.user = await ravendb.findUserById(userId);
        if (!req.user) {
            next()
            return;
        }
        res.redirect('/');
    });
}

module.exports = [ router, validateToken ];