var express = require('express');
var morgan = require('morgan');

var path = require('path');

var Pool = require('pg').Pool;

var crypto = require('crypto');

var bodyParser = require('body-parser');
var session = require('express-session');


var config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    ssl: true
};

var app = express();
app.use(morgan('combined'));

app.use(bodyParser.json());

var pool = new Pool(config);
var serveStatic = require('serve-static');

var counter = 1;

app.use(session({ secret: 'someRandomSecretValue', cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }, resave: true, saveUninitialized: true }));


app.get('/auth/check-login', function (req, res) {
   if (req.session && req.session.auth && req.session.auth.userId) {
       // Load the user object
       pool.query('SELECT * FROM "user" WHERE id = $1', [req.session.auth.userId], function (err, result) {
           if (err) {
                  res.status(500).send(JSON.stringify({'error' : err.toString()}));
              } else {
                  res.send(JSON.stringify({'username': result.rows[0].username}));   
           }
       });
   } else {
       res.status(400).send('You are not logged in');
   }
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});


app.get('/logout', function (req, res) {
   delete req.session.auth;
   res.end();
   
 /*
 var currentfile = req.params.currentlocation;
 if (currentfile === '') {
   res.sendFile(path.join(__dirname, 'ui', 'index.html'));
 } else {
     res.sendFile(path.join(__dirname, 'articles', currentfile));
 }*/
});


var fs = require('fs'),
    filePath = './ui/page.html';

// this for async way
/*fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) throw err;
    console.log(data);
});*/

//this is sync way
var pagefile = fs.readFileSync(filePath, 'utf8');


function createTemplate(data) {
    
    var title = data.title;
    var heading = data.heading;
    var content = data.content;
    var date = data.date;
    var username = data.username;

    var htmlTemplate = eval('`' +  pagefile + '`');
 
    return htmlTemplate;
}


function hash(input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');

  return ['pbkdf2Sync', "10000", salt,  (hashed.toString('hex'))].join('$');
}

app.get('/hash/:input', function(req, res) {
    var hashedString = hash(req.params.input, "Salmans-App-is-working-with-hash");
    res.send(hashedString);
});

app.get('/get-articles', function (req, res) {
   // make a select request
   // return a response with the results - select all articles along with the username
   pool.query('SELECT article.*, "user".username FROM article, "user" WHERE article.user_id = "user".id ORDER BY date DESC', function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
         
          res.send(JSON.stringify(result.rows));
      }
   });
});

app.get('/get-comments/:articleName', function (req, res) {
   // make a select request
   // return a response with the results
   pool.query('SELECT comment.*, "user".username FROM article, comment, "user" WHERE article.title = $1 AND article.id = comment.article_id AND comment.user_id = "user".id ORDER BY comment.timestamp DESC', [req.params.articleName], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send(JSON.stringify(result.rows));
      }
   });
});

app.get('/articles/:articleName', function (req, res) {
  // SELECT * FROM article WHERE title = '\'; DELETE WHERE a = \'asdf'
  pool.query('SELECT article.*,"user".username FROM article, "user" WHERE title = $1 AND article.user_id="user".id', [req.params.articleName], function (err, result) {
    if (err) {
        res.status(500).send(err.toString());
    } else {
        if (result.rows.length === 0) {
            res.status(404).send('Article not found');
        } else {
            var articleData = result.rows[0];
 
            res.send(createTemplate(articleData));
           
        }
    }
  });
});

app.get('/get-num-comments/:articleName', function (req, res) {
  
  pool.query('SELECT count(comment.*) FROM comment, article WHERE article.title = $1 AND article.id = comment.article_id', [req.params.articleName], function (err, result) {
    if (err) {
        res.status(500).send(err.toString());
    } else {
        if (result.rows.length === 0) {
            res.status(404).send('Article not found');
        } else {
            
            res.send(JSON.stringify(result.rows[0]));
           
        }
    }
  });
});
/*
//Create user function 
app.post('/create-user', function (req, res) {
   // username, password
   // {"username": "Salman", "password": "password"}
   // JSON
   var username = req.body.username;
   var password = req.body.password;
     if ( username && password) { // that is username and password are not empty
   
           var salt = crypto.randomBytes(128).toString('hex');
           var dbString = hash(password, salt);
           pool.query('INSERT INTO "user" (username, password) VALUES ($1, $2)', [username, dbString], function (err, result) {
              if (err) {
                  res.status(500).send(err.toString());
              } else {
                  res.send('User successfully created: ' + username);
              }
           });
     }
    else {
           res.status(403).send('username/password is invalid');
      }
});
*/
app.post('/create-user', function (req, res) {
   // username, password
   // {"username": "Salman", "password": "password"}
   // JSON
   var username = req.body.username;
   var password = req.body.password;
     if ( username && password) { // that is username and password are not empty
   
           var salt = crypto.randomBytes(128).toString('hex');
           var dbString = hash(password, salt);
           pool.query('INSERT INTO "user" (username, password) VALUES ($1, $2)', [username, dbString], function (err, result) {
              if (err) {
                  res.status(500).send(JSON.stringify({'error' : err.toString()}));
              } else {
                  res.send(JSON.stringify({'message' : 'User successfully created: ' + username}));
              }
           });
     }
    else {
           res.status(403).send(JSON.stringify({'error' : 'username/password is invalid'}));
      }
});
/*
app.post('/login', function (req, res) {
   var username = req.body.username;
   var password = req.body.password;
   
   if ( username && password) { // that is username and password are not empty
      
       pool.query('SELECT * FROM "user" WHERE username = $1', [username], function (err, result) {
          if (err) {
             // alert(res.send(err.toString()));
              res.status(500).send(err.toString());
          } else {
              if (result.rows.length === 0) {
                  res.status(403).send('username/password is invalid');
              } else {
                  // Match the password
                  var dbString = result.rows[0].password;
                  var salt = dbString.split('$')[2];
                  var hashedPassword = hash(password, salt); // Creating a hash based on the password submitted and the original salt
                  if (hashedPassword === dbString) {
                    
                    // Set the session
                    req.session.auth = {userId: result.rows[0].id};
                    // set cookie with a session id
                    // internally, on the server side, it maps the session id to an object
                    // { auth: {userId }}
                    res.send('credentials correct!');
                    
                  } else {
                    res.status(403).send('username/password is invalid');
                  }
              }
          }
       });
       }
   else {
        res.status(403).send('Invalid Username/Password Values!');
   }
});
*/
app.post('/login', function (req, res) {
   var username = req.body.username;
   var password = req.body.password;
   
   if ( username && password) { // that is username and password are not empty
      
       pool.query('SELECT * FROM "user" WHERE username = $1', [username], function (err, result) {
          if (err) {
             // alert(res.send(err.toString()));
              res.status(500).send(JSON.stringify({'error': err.toString()}));
          } else {
              if (result.rows.length === 0) {
                  res.status(403).send(JSON.stringify({'error':'username/password is invalid'}));
              } else {
                  // Match the password
                  var dbString = result.rows[0].password;
                  var salt = dbString.split('$')[2];
                  var hashedPassword = hash(password, salt); // Creating a hash based on the password submitted and the original salt
                  if (hashedPassword === dbString) {
                     
                    // Set the session
                    req.session.auth = {userId: result.rows[0].id};
                    // set cookie with a session id
                    // internally, on the server side, it maps the session id to an object
                    // { auth: {userId }}
                    res.send(JSON.stringify({'message': result.rows[0].username}));
                    
                  } else {
                    res.status(403).send(JSON.stringify({'error': 'username/password is invalid'}));
                  }
              }
          }
       });
       }
   else {
        res.status(403).send('Invalid Username/Password Values!');
   }
});

app.post('/submit-comment/:articleName', function (req, res) {
   // Check if the user is logged in
    if (req.session && req.session.auth && req.session.auth.userId) {
        // First check if the article exists and get the article-id
        pool.query('SELECT * from article where title = $1', [req.params.articleName], function (err, result) {
            if (err) {
                res.status(500).send(err.toString());
            } else {
                if (result.rows.length === 0) {
                    res.status(400).send('Article not found');
                } else {
                    var articleId = result.rows[0].id;
                    // Now insert the right comment for this article
                    pool.query(
                        "INSERT INTO comment (comment, article_id, user_id) VALUES ($1, $2, $3)",
                        [req.body.comment, articleId, req.session.auth.userId],
                        function (err, result) {
                            if (err) {
                                res.status(500).send(err.toString());
                            } else {
                                res.status(200).send('Comment inserted!');
                            }
                        });
                }
            }
       });     
    } else {
        res.status(403).send('Only logged in users can comment');
    }
});

 app.get('/get-stats', function (req, res) {
   // make a select request
   // return a response with the results - select all counts of articles, comments and users
   pool.query(`SELECT (select count(*)  from article) as articleCount, (select count(*)  from "user") as userCount, (select count(*) FROM comment) as commentCount`, function (err, result) {
       
      if (err) {
          res.status(500).send(err.toString());
      } else {
          counter = counter + 1;
          result.rows[0].counter = counter.toString();
         res.send(JSON.stringify(result.rows));
      }
   });
});

 app.get('/get-footercomments', function (req, res) {
   // make a select request
   // return a response with the results - select all counts of articles, comments and users
   pool.query('SELECT comment.*, "user".username, article.title FROM comment, "user", article WHERE comment.user_id = "user".id AND comment.article_id = article.id ORDER BY comment.timestamp DESC', function (err, result) {
       
      if (err) {
          res.status(500).send(err.toString());
      } else {
          
          res.send(JSON.stringify(result.rows));
      }
   });
});


//Create new article function 
app.post('/submit-article', function (req, res) {
   // username, password
   // {"username": "Salman", "password": "password"}
   // JSON
   var username = req.session.auth.userId;
   var article = req.body.article;
   var title = req.body.title;
   var heading = req.body.heading;
   var currentdate = new Date();
   var month = '' + (currentdate.getMonth() + 1);
   var day = '' + currentdate.getDate();
   var year = currentdate.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    var shortdate =   [year, month, day].join('-');

  // console.log('username:'+username + 'Article:' + article + 'title: ' + title);
  /* pool.query('SELECT "user".id FROM "user" WHERE "user".username=$1',[username], function(err, result) {
       if (err) {
           res.status(500).send(err.toString());
       } else {
        var userid = result.rows[0]; 
       }
      
   });
   console.log(req.session.auth.userid);*/
   pool.query('INSERT INTO "article" (user_id, title, content, heading, date) VALUES ($1, $2, $3, $4, $5)', [req.session.auth.userId, title, article, heading, shortdate], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send('Article Added Successfully: ' + heading);
      }
   });
});


/****
 * 
 * serve static files
 * 
 ****/
 

app.use("/css", express.static(path.join(__dirname, "/css")));
app.use("/js", express.static(path.join(__dirname,'/js')));
app.use("/images", express.static(path.join(__dirname,'/images')));
app.use("/ui", express.static(path.join(__dirname,'/ui')));

app.get('/favicon.ico', function (req, res) {
  res.sendFile(path.join(__dirname, '/', 'favicon.ico'));
});

var port = process.env.PORT;

if (!port) {
    port = 11223;
}

app.listen(port, function(){
    console.log(`Blog App listening on port ${port} !`);
});