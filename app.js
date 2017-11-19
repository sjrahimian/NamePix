const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const app = express();
const watson = require('watson-developer-cloud');

// Set Storage Engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    cb(null,file.originalname);
  }
});

const mult = multer({
  storage: storage,
  limits:{fileSize: 1000000},
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
});

var files = [];
var words = [];

// Init Upload
const upload = mult.array('images', 10);

// Check File Type
function checkFileType(file, cb){
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif|bmp/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Error: Images Only!');
  }
}


// EJS
app.set('view engine', 'ejs');

// Public Folder
app.use(express.static('./public'));

app.get('/', (req, res) => res.render('index'));

app.post('/upload', upload, (req, res) => {
  if(req.files.length < 1)
    res.render('index', {
      msg: 'Error: No Files Selected!'
    });
  else
    for (var i = 0; i < req.files.length; i++){
      let f = req.files[i];
      var fs = require('fs');

      var visual_recognition = watson.visual_recognition({
        api_key: '8d7aced8efa9ce11cca985d203dce5989cc20148',
        version: 'v3',
        version_date: '2016-05-20'
      });

      let filepath = `./public/uploads/${f.originalname}`;
      var params = {
        images_file: fs.createReadStream(filepath)
      };

      visual_recognition.classify(params, function(err2, res2) {
        if (err2){
        console.log(err2);
        }
        else {
          var query = res2;
          var word = highest(query);

          // res.render('index', {
          //   msg: `File Uploaded! It is a ${word}!`,
          //   file: filepath
          // });
          // res.send(word);
          addToDict(word, filepath)
        }
      });
    }
  });

const port = 8080;

app.listen(port, () => console.log(`Server started on port ${port}`));

function addToDict(word, filepath){
  files.push(filepath);
  words.push(word);
  console.log(`File -> ${filepath}\nWord -> ${word}`);
}

// Watson function
function highest(query){
  // array of class, score, type_hierarchy
  var classes = query["images"][0]['classifiers'][0]['classes'];
  // make array of scores
  var scores = [];
  for (var i = 0; i < classes.length; i++){
    scores.push(classes[i]['score'])
  }
  var max = -1;
  var maxIndex = -1;
  for (var i = 0; i < scores.length; i++){
    if (scores[i] > max && numWords(classes[i]['class']) == 1){
      max = scores[i];
      maxIndex = i;
    }
  }

  var maxClass = classes[maxIndex]['class'];

  return maxClass;
}

function numWords(s){
  return s.split(' ').length;
}
