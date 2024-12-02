require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');

mongoose.connect(process.env.URL_DB);

const userSchema = new mongoose.Schema({
  username: String,
}, { versionKey: false })

const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  username: { type: String, required: true},
  description: String,
  duration: Number,
  date: {type : Date, default: Date.now()},
}, {versionKey: false})

exerciseSchema.set('toJSON',{
  transform: (doc, ret)=>{
    if(ret.date){
      ret.date = new Date(ret.date).toDateString();
    }
    return ret;
  }
})

const Exercise = mongoose.model('Exercise', exerciseSchema);


app.use(cors())
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async(req, res)=>{
  if(!req.body.username || typeof req.body.username !== 'string'){
    res.status(401).json({error: 'username is required and must be string'})
  }
  //create new user
  const userObj = new User({username: req.body.username});
  try{
    // save user in databse
    const user = await userObj.save();
    res.status(201).json(user);
  }catch(err){
    console.log(err);
    res.status(500).json('error occured while saving user')
  }
})

app.post('/api/users/:_id/exercises', async(req, res)=>{
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try{
  const user = await User.findById(id);
  if(!user){
    return res.status(400).json('there is no user for this id')
  }
  const exerciceObj = new Exercise({
    username: user.username,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date()
  })

  const excercise = await exerciceObj.save();
  res.json({
    username: user.username,
    description: excercise.description,
    duration: excercise.duration,
    date: (excercise.date).toDateString(),
    _id: user._id
  });
 }catch(err){
  console.log(err);
  res.status(500).json('error occured while saving exercises')
 }
 })

app.get('/api/users', async (req, res)=>{
  try{
    const users = await User.find({}, '-__v');
    res.json(users);
  }catch(err){
    console.log(err)
    res.status(500).json('erro occured while retreiving users')
  }

})

app.get('/api/users/:_id/logs', async(req, res)=>{
  const {from, to , limit} = req.query;
  const id = req.params._id;
  try{
    const user = await User.findById(id);
    if(!user){
      res.send('there is no user for this id')
    }
    const filter = {username: user.username};
    if(from) filter.date = {...filter.date, $gte: new Date(from)};
    if(to) filter.date = {...filter.date, $lte: new Date(to)};

    const exercises = await Exercise.find(filter, '-username -_id')
      .sort('date')
      .limit(limit ? parseInt(limit) : 0);
  
    const count = exercises.length;
    res.json({
      username: user.username,
      count,
      _id: user._id,
      log: exercises
  })

  }catch(err){
    console.log(err);
    res.status(500).json({error: 'error occured during retreving data'})
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
