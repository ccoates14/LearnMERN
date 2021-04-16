const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {check, validationResult} = require('express-validator/check');
const Profile = require('../../models/Profile');
const config = require('config');
const request = require('request');

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

router.delete('/experience/:exp_id', [auth], async (req, res) => {
  const userId = req.user.id;
  const experienceId = req.params.exp_id;
  let profile = await Profile.findOne({
    user: userId
  });

  if (!profile) return res.status(500).send("No Such Profile");
  if (!profile.experience) return res.status(500).send("No experience to remove from");

  const filteredExperience = profile.experience.filter(f => f._id != experienceId);
  if (filteredExperience.length == profile.experience.length) return res.status(500).send("No experience to remove");

  profile.experience = filteredExperience;
  await profile.save();

  return res.json(profile);
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
    let profile = await Profile.findOne({
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

    if (!profile.experience) profile.experience = [];

    profile.experience.unshift(experienceFields);

    await profile.save();

    return res.status(201).json(profile);

  }catch(err){
    console.error(err.message);
    return res.status(500).send('Internal Server Error');
  }
});

router.put('/education', [auth, [
  check('school', 'school is required').not().isEmpty(),
  check('fieldofstudy', 'fieldofstudy is required').not().isEmpty(),
  check('degree', 'degree is required').not().isEmpty(),
  check('from', 'from is required').not().isEmpty(),
]], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()){
    return res.status(400).json({
      errors: errors.array()
    });
  }

  if (!profile.education) profile.education = [];

  let newEducationFields = ({
    school,
    degree,
    fieldofstudy,
    from,
    to,
    current,
    description
  } = req.body);

  profile.education.unshift(newEducationFields);

  await profile.save();

  return res.status(201).json(profile);
});

router.delete('/education/:ed_id', [auth], async (req, res) => {
  const userId = req.user.id;
  const educationId = req.params.ed_id;
  let profile = await Profile.findOne({
    user: userId
  });

  if (!profile) return res.status(500).send("No Such Profile");
  if (!profile.education) return res.status(500).send("No education to remove from");

  const filteredEducation = profile.education.filter(f => f._id != educationId);
  if (filteredEducation.length == profile.education.length) return res.status(500).send("No education to remove");

  profile.education = filteredEducation;
  await profile.save();

  return res.json(profile);
});


// @route    GET api/profile/github/:username
// @desc     Get user repos from Github
// @access   Public
router.get('/github/:username', async (req, res) => {
 
  try {
    const uri = `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc` +
    `&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`;
    const headers = {
      'user-agent': 'node.js',
    };

    request({
      uri,
      method: 'GET',
      headers
    },
    (error, response, body) => {
      if (error) console.error(error);
      if (response.statusCode != '200') return res.status(404).send("Error Finding profile");
      return res.json(JSON.parse(body));
    }
    );
  
  } catch (err) {
    console.error(err.message);
    return res.status(404).json({ msg: 'No Github profile found' });
  }
});

module.exports = router;