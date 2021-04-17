const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {check, validationResult} = require('express-validator/check');
const Post = require('../../models/Post');
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const config = require('config');
const request = require('request');
//@route  GET   api/post
//@desc   test  route
//@access Public
router.post('/', [auth, [
  check('text', 'text is required').not().isEmpty()
]], (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()){
    return res.status(400).json({
      errors: errors.array()
    });
  }

  try{
    const user = await User.findById(req.user.id).select('-password');

    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: user.avatar,
      user: req.user.id
    });

    const post = await newPost.save();

    return res.json(post);
  }catch(err){
    console.error(err.message);
    return res.status(500).send('Server Error');
  }

});

router.get('/', (_, res) => {
  try{
    const posts = await Post.find().sort({date: -1});
    return res.json(posts);
  }catch(err){
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

router.get('/:post_id', (req, res) => {
  try{
    const postId = req.params.post_id;
    const post = await Post.findById({
      _id: postId
    });
    if (!post) throw Error("No Post Found");
    return res.json(post);
  }catch(err){
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

router.delete('/:post_id', [auth], (req, res) => {
  try{
    const postId = req.params.post_id;
    const userId = req.user.id;

    const post = await Post.findOneAndRemove({
      _id: postId
    });
    if (!post) throw Error("No Post Found");
    if (post.user.toString() !== userId) throw Error("User does not own post!");
    
    return res.json(post);
  }catch(err){
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

router.put('/like/:post_id', [auth], (req, res) => {
  const postId = req.params.post_id;
  const userId = req.user.id;

  const post = await Post.findOneAndRemove({
    _id: postId
  });
  if (!post) return res.status(400).send('No post found!');

  if (!post.likes) post.likes = [];

  if (posts.likes.find(l => l.user.toString() === userId)){
    return res.status(400).send("Can't like same post multiple times");
  }

  post.likes.unshift({
    user: userId
  });

  await post.save();

  return res.status(201);
});


router.put('/unlike/:post_id', [auth], (req, res) => {
  const postId = req.params.post_id;
  const userId = req.user.id;

  const post = await Post.findOneAndRemove({
    _id: postId
  });
  if (!post) return res.status(400).send('No Post found');

  if (!post.likes || !posts.likes.find(l => l.user.toString() === userId)) return res.status(400).send("No like found!");

  if (!post.likes) post.likes = [];

  post.likes = post.likes.filter(l => l.user.toString() !== userId);

  await post.save();

  return res.status(201);
});
module.exports = router;