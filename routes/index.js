/**
 * Created by kyleb on 9/25/2017.
 */

var express = require('express');
var fs = require('fs');
var md = require('marked').setOptions({ breaks: true });
var router = express.Router();

var scoreboard = {};
var scores = {};
var contestants = [];

var questions = {};
var questionNames = [];
fs.readdirSync('./questions').forEach(function(fileName) {
  if(fs.lstatSync('./questions/'+fileName).isDirectory()) {
    return;
  }
  var newQuestion = new Question(require('../questions/'+fileName));
  questionNames.push(newQuestion.getName());
  questions[newQuestion.getName()] = newQuestion;
});

function Question(json) {
  var name = json['name'] || 'No Name Specified';

  var points = json['points'] || 0;

  var promptPath = json['prompt-path'];
  var prompt = json['prompt'] || '';
  if(promptPath) {
    prompt = fs.readFileSync(promptPath).toString();
  }

  var inputPath = json['input-path'];
  var hasInput = !!inputPath;

  var answerPath = json['answer-path'];
  var answer = json['answer'] || '';
  if(answerPath) {
    answer = fs.readFileSync(answerPath).toString();
  }

  this.render = function(res) {
    res.render('question', {
      title: name,
      points: points,
      hasInput: hasInput,
      inputPath: inputPath,
      markdown: md(prompt),
      questionNames: questionNames
    });
  };

  this.check = function(text) {
    return text === answer;
  };

  this.getName = function() {
    return name;
  };

  this.getPoints = function() {
    return points;
  }
}

router.get('/', function(req, res, next) {
  res.render('home', {
    title: 'ACM Code Jam',
    questions: questions,
    questionNames: questionNames,
    contestants: contestants,
    scoreboard: scoreboard,
    scores: scores
  });
});

router.get('/question/:qname', function(req, res, next) {
  var qname = req.params.qname;

  if(!qname || !questionNames.includes(qname)) {
    var err = new Error('Question Not Found');
    err.status = 404;
    next(err);
  } else {
    questions[qname].render(res);
  }
});

router.post('/submit/:qname', function(req, res, next) {
  var qname = req.params.qname;
  var submission = req.body.submission;
  var contestant = req.body.name;

  if(!qname || !questionNames.includes(qname)) {
    var err = new Error('Question Not Found');
    err.status = 404;
    next(err);
  } else {
    if(questions[qname].check(submission)) {

      if(!contestants.includes(contestant)) {
        scoreboard[contestant] = {};
        scores[contestant] = 0;
        contestants.push(contestant);
      }

      if(!scoreboard[contestant][qname]) {
        scoreboard[contestant][qname] = true;
        scores[contestant] += questions[qname].getPoints();
        console.log(contestant + ' has completed ' + qname + ' and has ' + scores[contestant] + ' points');
      }

      contestants.sort(function(a,b) {
        if(scores[a] < scores[b]) {
          return 1;
        } else if(scores[a] > scores[b]) {
          return -1;
        } else {
          return 0;
        }
      });

      res.render('result', {text: 'Congratulations', questionNames: questionNames});
    } else {
      res.render('result', {text: 'Try Again', questionNames: questionNames});
    }
  }
});

// catch 404 and forward to error handler
router.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
router.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {questionNames: questionNames});
});

module.exports = router;