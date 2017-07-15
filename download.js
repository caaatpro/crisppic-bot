var fs = require('fs'),
  request = require('request'),
  mysql = require('mysql');
  mysql = require('mysql');

const db = mysql.createConnection({
  host: '89.223.29.88',
  user: 'movies',
  password: 'i48mAtrgcV9BRjNn',
  database: 'movies'
});

var movies = [];

var query = 'SELECT id, kinopoisk_id FROM movies WHERE poster = ""';
db.query(query, (err, result) => {
  if (err) throw err;

  for (var i = 0; i < result.length; i++) {
    movies.push(result[i]);
  }

  download(0);
});

var download = (i) => {
  var uri = 'https://st.kp.yandex.net/images/film_big/'+movies[i].kinopoisk_id+'.jpg';
  var filename = new Date().getTime()+'.jpg';
  request.head(uri, (err, res, body) => {
    if (err) console.log(err);

    if (res.req.path == '/images/no-poster.gif') {
      return updateMovie(i, 'no-poster.jpg');
    } else {
      request(uri).pipe(fs.createWriteStream('images/'+filename)).on('close', () => {
        return updateMovie(i, filename);
      });
    }
  });
};

var updateMovie = (i, photoUrl) => {
  var query = 'UPDATE movies SET poster = "'+photoUrl+'" WHERE id = '+movies[i].id;
  console.log(query);
  db.query(query, (err, result) => {
    if (err) throw err;

    download(i+1);
  });
};
