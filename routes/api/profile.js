const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {check, validationResult} = require('express-validator/check');
const Profile = require('../../models/Profile');
//@route  GET   api/profile/me
//@desc   get current user
//@access Private
router.get('/me', auth, async (req, res) => {
  try{
    const profile = await Profile.findOne({
      user: req.user.id
    }).populate(
      'user',
      ['name', 'avatar']
    );

    if (profile){
      return res.json(profile);
    }else{
      throw Error("Server Error");
    }
  }catch(err){
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


//get all users
router.get('/', async (_, res) => {
  return res.json(await Profile.find().populate('user', ['name', 'avatar']));
});

router.get('/user/:user_id', async (req, res) => {
  try{
    const profile = (await Profile.findOne({user: req.params.user_id})).populate('user', ['name', 'avatar']);

    if (!profile) return res.status(204);
    return res.json(profile);
  }catch(err){
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
 
});

//create or update profile
router.post('/', [auth, [
  check('status', 'Status is required').not().isEmpty(),
  check('skills', 'Skills is required').not().isEmpty()
]], async(req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()){
    return res.status(400).json({
      errors: errors.array()
    });
  }else{
    const socialFields = ['youtube', 'facebook', 'twitter', 'instagram', 'linkedin'];
    const fields = ({
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body);

    fields.social = {};

    for (let f in fields){

      if (!fields[f]){  
        delete fields[f];
      }else if (f == 'skills'){
        fields[f] = fields[f].split(",").map(skill => skill.trim());
      }else if (socialFields.includes(f)){
        fields.social[f] = fields[f];
        delete fields[f];
      }
    }

    fields.user = req.user.id;

    try{
      let profile = await Profile.findOne(
        {user: req.user.id}
      );

      if (profile){
        profile = await Profile.findOneAndUpdate({
          user: req.user.id
        },
        {
          $set: fields
        },
        {
          new: true
        }
        );

      }else{
        profile = new Profile(fields);
        await profile.save();
      }

      return res.json(profile);
    }catch(err){
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
  }
});

router.delete('/', [auth], async (req, res) => {
  const userId = req.user.id;
  try{
    const profile = await Profile.findOneAndRemove({user: userId});
    await User.findOneAndRemove({_id:userId});
    return res.json(profile);
  } catch(err){
    console.error(err.message);
    return res.status(500).send("Internal Server Error");
  }


});


router.put('/experience', [auth, [check('title' , 'title is required').not().isEmpty()
,check('company', 'company is required').not().isEmpty(),
check('from', 'from is required').not().isEmpty()]], 
async (req, res) => {

  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()){
      return res.status(400).json({
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    let profile = Profile.findOne({
      user: userId
    });

    if (!profile) throw Error("No Profile found");

    const experienceFields = ({
      title,
      company,
      location,
      from,
      to,
      current,
      description
    } = req.body);

    profile.experience.unshit(experienceFields);

    await profile.save();

    return res.status(201).json(profile);

  }catch(err){
    console.error(err.message);
    return res.status(500).send('Internal Server Error');
  }
});


module.exports = router;