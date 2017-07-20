const request = require('request'),
  cheerio = require('cheerio'),
  iconv = require('iconv-lite'),
  http = require('http'),
  url = require('url'),
  TorControl = require('tor-control'),
  Agent = require('socks5-https-client/lib/Agent'),
  database = require('./utils/db'),
  textUtil = require('./utils/text');

const config = {
  port: 8080
};

var newCircuit = false;

var control = new TorControl();

var GENRES = {},
  COUNTRIES = {};

const db = database.init(() => {
  getGenres().then(() => {
    console.log('Genres ok');
  });
  getCountries().then(() => {
    console.log('Countries ok');
  });

});
db.config.queryFormat = function(query, values) {
  return query.replace(/\{(\w+)\}/g, function(txt, key) {
    if (values.hasOwnProperty(key)) {
      return this.escape(values[key]);
    }
    return txt;
  }.bind(this));
};

http.createServer((request, response) => {
  var queryData = url.parse(request.url, true).query;
  response.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  var telegramId = 0;
  if (queryData.telegramId) {
    telegramId = queryData.telegramId;
  }

  if (queryData.url) {
    getMovieByUrl(decodeURI(queryData.url), (result) => {
      response.end(JSON.stringify(result));
    });
  } else if (queryData.search) {
    getMovieByTitle(decodeURI(queryData.search), telegramId)
      .then((result) => {
        response.end(JSON.stringify(result));
      });
  } else if (queryData.movieId) {
    getMovieById(queryData.movieId, telegramId)
      .then((result) => {
        console.log(result);
        response.end(JSON.stringify(result));
      });
  } else if (queryData.watchMovieId) {
    let watch = async() => {
      let user = await userInfo(telegramId);
      let result = await userGetWatch(queryData.watchMovieId, user[0].id);
      return result;
    };
    watch()
      .then((result) => {
        response.end(JSON.stringify(result));
      })
  } else if (queryData.setWatchMovieId) {
    var telegramId = 0;
    if (queryData.telegramId) {
      telegramId = queryData.telegramId;
    }

    let watch = async() => {
      let user = await userInfo(queryData.telegramId);
      let result = await userSetWatch(queryData.setWatchMovieId, user[0].id);
      return result;
    };
    watch()
      .then((result) => {
        response.end(JSON.stringify(result));
      });
  }
}).listen(config.port);
console.log('Server listening at port %d', config.port);

var movieHandler = (movie) => {
  // genres
  movie.genres = movie.genres.split(',');
  for (var i = 0; i < movie.genres.length; i++) {
    movie.genres[i] = GENRES[movie.genres[i]].ru;
  }
  movie.genres = movie.genres.join(', ');

  // countries
  movie.countries = movie.countries.split(',');
  for (var i = 0; i < movie.countries.length; i++) {
    movie.countries[i] = COUNTRIES[movie.countries[i]].ru;
  }
  movie.countries = movie.countries.join(', ');

  // duration
  if (movie.duration < 60) {
    movie.duration = movie.duration + ' мин.';
  } else {
    movie.duration = Math.floor(movie.duration/60) + ' час. ' + movie.duration%60 + ' мин.';
  }

  return movie;
};

var getMovieByTitle = async(search, telegramId) => {
  let movie = await db.queryAsync('SELECT * FROM `movies` WHERE search LIKE {search} LIMIT 15', {
    search: '%'+textUtil.cleanExtra(search)+'%'
  });

  if (movie.length == 0) {
    return {
      'error': '404'
    }
  }

  if (movie.length == 1) {
    movie = movieHandler(movie);

    let user = await userInfo(telegramId);
    console.log(telegramId);
    console.log(user);
    let [views, watch] = await Promise.all([
      userGetViews(movie[0].id, user[0].id),
      userGetWatch(movie[0].id, user[0].id)
    ]);

    return {
      movie,
      watch,
      views
    };
  }
  return movie;
};

var userGetViews = async(movieID, userID) => {
  // type 0
  return db.queryAsync('SELECT id FROM `userMovie` WHERE type = {type} AND userID = {userID} AND movieID = {movieID}', {
    type: 0,
    movieID: movieID,
    userID: userID
  });
};

var userGetWatch = async(movieID, userID) => {
  // type 1
  return db.queryAsync('SELECT id FROM `userMovie` WHERE type = {type} AND userID = {userID} AND movieID = {movieID} LIMIT 1', {
    type: 1,
    movieID: movieID,
    userID: userID
  });
};

var userSetWatch = async(movieID, userID) => {
  // type 1
  let userMovieWatch = await db.queryAsync('SELECT id FROM `userMovie` WHERE type = {type} AND userID = {userID} AND movieID = {movieID} LIMIT 1', {
    type: 1,
    movieID: movieID,
    userID: userID
  });

  if (userMovieWatch.length) {
    // remove
    await db.queryAsync('DELETE FROM `userMovie` WHERE type = {type} AND userID = {userID} AND movieID = {movieID} LIMIT 1', {
      type: 1,
      movieID: movieID,
      userID: userID
    });
    return false;
  } else {
    // insert
    await db.queryAsync('INSERT `userMovie` (type, userID, movieID) VALUES ({type}, {userID}, {movieID})', {
      type: 1,
      movieID: movieID,
      userID: userID
    });
    return true;
  }
};

var userInfo = async(telegramId) => {
  return db.queryAsync('SELECT id FROM `users` WHERE telegramId = {telegramId} LIMIT 1', {
    telegramId: telegramId
  });
};

var getMovieById = async(id, telegramId) => {

  let [movie, user] = await Promise.all([
    db.queryAsync('SELECT * FROM `movies` WHERE id = {id} LIMIT 1', {
      id: id
    }),
    userInfo(telegramId)
  ]);

  console.log(movie);

  if (movie.length == 0) {
    return {
      'error': '404'
    }
  }

  movie = movieHandler(movie[0]);

  console.log(movie);

  let [views, watch] = await Promise.all([
    userGetViews(movie.id, user[0].id),
    userGetWatch(movie.id, user[0].id)
  ]);

  watch = watch.length ? true : false;

  views = views.length;

  return {
    movie,
    watch,
    views
  };
};

var getGenres = async() => {
  let result = await db.queryAsync('SELECT * FROM `genres`');
  for (var ganre of result) {
    GENRES[ganre.id] = ganre;
  }
};
var getGenre = (name) => {
  for (var key in GENRES) {
    if (GENRES.hasOwnProperty(key)) {
      if (GENRES[key].ru == name || GENRES[key].en == name) {
        return GENRES[key].id;
      }
    }
  }

  return 0;
}

var getCountries = async() => {
  let result = await db.queryAsync('SELECT * FROM `countries`');
  for (var countrie of result) {
    COUNTRIES[countrie.id] = countrie;
  }
}

var getCountrie = (name) => {
  for (var key in COUNTRIES) {
    if (COUNTRIES.hasOwnProperty(key)) {
      if (COUNTRIES[key].ru == name || COUNTRIES[key].en == name) {
        return COUNTRIES[key].id;
      }
    }
  }

  return 0;
}
