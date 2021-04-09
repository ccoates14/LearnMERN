const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const { check, validationResult } = require('express-validator/check');
const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcryptjs');

//@route  GET   api/auth
//@desc   test  route
//@access Public
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('server error');
  }

  res.send('auth route');
});

//@route  POST   api/users
//@desc   test  route
//@access Public
router.post(
  '/',
  [
    check('email', 'Please include valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {
      //see ifuser exists
      let user = await User.findOne({ email });
      let badCreds = !user;

      if (!badCreds){
      //  console.log('user exists');
        badCreds = ! (await bcrypt.compare(password, user.password));
      }

      if (badCreds){
        return res.status(400).json({
          errors: [
            {
              msg: 'bad creds',
            },
          ],
        });
      }

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 36000 },
        (err, token) => {
          if (err) {
            throw err;
          }

          res.json({
            token,
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
