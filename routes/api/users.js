const express = require('express');
const router = express.Router();
const {check, validationResult} = require('express-validator/check'); 
const gravatar = require('gravatar');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
//@route  POST   api/users
//@desc   test  route
//@access Public
router.post('/', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include valid email').isEmail(),
  check('password', 'Please enter a password with 6 character or more').isLength({min: 6})
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()){
    return res.status(400).json(
      {
        errors: errors.array()
      }
    );
  }

  const {name, email, password} = req.body;

  try{
     //see ifuser exists
     let user = await User.findOne({email});

     if (user){ //a user with this email already exists when we were trying to create them
       return res.status(400).json({
        errors: [
          {
            message: 'user already exists'
          }
        ]
       });
     }

    const avatar = gravatar.url(email, {
      s: '200',
      r: 'pg',
      d: 'mm'
    });

    user = new User({
      name, 
      email,
      avatar, 
      password
    });

    let salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,

      }
    };

    jwt.sign(payload, config.get('jwtSecret'), {expiresIn: 36000}, (err, token) => {
      if (err){
        throw err;
      }

      res.json({
        token
      });
    });



  } catch (err){
    console.error(err.message);
    return res.status(500).send("Server Error");
  }

});




module.exports = router;