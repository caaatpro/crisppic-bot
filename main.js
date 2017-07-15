const request = require('request'),
  cheerio = require('cheerio'),
  iconv = require('iconv-lite');
http = require('http'),
  url = require('url'),
  TorControl = require('tor-control'),
  Agent = require('socks5-https-client/lib/Agent'),
  database = require('./utils/db');

const config = {
  port: 8080
};



const db = database.init(() => {
  console.log(2);
  init();
});
db.config.queryFormat = function(query, values) {
  return query.replace(/\{(\w+)\}/g, function(txt, key) {
    if (values.hasOwnProperty(key)) {
      return this.escape(values[key]);
    }
    return txt;
  }.bind(this));
};

var newCircuit = false;

var control = new TorControl();

var GENRES = {},
  COUNTRIES = {};

var inits = 2;

var init = () => {

  /*const makeRequest = async () => {
    let [rainbow, food] = await Promise.all([db.queryAsync('SELECT * FROM `genres`'), db.queryAsync('SELECT * FROM `genres`')])
    return {rainbow, food};
  }

  makeRequest().then((result) => {
    console.log(result);
  })*/

  getGenres(() => {
    console.log('Genres ok');
    initFinish();
  });
  getCountries(() => {
    console.log('Countries ok');
    initFinish();
  });
};

var initFinish = () => {
  inits--;
  if (inits == 0) {
    console.log('Inits ok\n');

  }
};

http.createServer((request, response) => {
  var queryData = url.parse(request.url, true).query;
  response.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  if (queryData.url) {
    getMovieByUrl(decodeURI(queryData.url), (result) => {
      response.end(JSON.stringify(result));
    });
  } else if (queryData.search) {
    getMovie(decodeURI(queryData.search))
      .then((result) => {
        response.end(JSON.stringify(result));
      });
  } else if (queryData.movieId) {
    var telegramId = 0;
    if (queryData.telegramId) {
      telegramId = queryData.telegramId;
    }
    getMovieById(queryData.movieId, telegramId)
      .then((result) => {
        console.log(result);
        response.end(JSON.stringify(result));
      });
  } else if (queryData.watchMovieId) {
    var telegramId = 0;
    if (queryData.telegramId) {
      telegramId = queryData.telegramId;
    }

    let watch = async () => {
      let user = await userInfo(queryData.telegramId);
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

    let watch = async () => {
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

var getMovieByUrl = (url, callback) => {
  // Movie
  var options = {
    url: url,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:54.0) Gecko/20100101 Firefox/54.0'
    },
    // strictSSL: true,
    agentClass: Agent,
    agentOptions: {
      socksHost: '127.0.0.1',
      socksPort: '9050'
    },
    encoding: 'utf-8'
  }

  request(options, (err, res, body) => {
    if (err) {
      console.log(err);
      return getMovieByUrl(url, callback);
    }

    if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      return;
    }

    $ = cheerio.load(body);

    if ($('title').text() == 'КиноПоиск.ru') {
      console.log('Блин!');

      if (newCircuit) {
        return getMovieByUrl(url, callback);
      } else {
        newCircuit = true;
        control.signalNewnym((err, status) => { // Get a new circuit
          newCircuit = false;
          console.log('Get a new circuit');
          if (err) {
            console.log(err);
            return;
          }

          console.log(status);
          console.log(err);

          return getMovieByUrl(url, callback);
        });
      }

      // callback('bad');
      return;
    }

    var movie = {
      'type': 'movie',
      'title': '',
      'alternativeTitle': '',
      'year': '',
      'countries': '',
      'genres': '',
      'duration': '',
      'premiere': '',
      'description': '',
      'kinopoisk_rating': '',
      'IMDb_rating': '',
      'age': '',
      'kinopoisk_id': res.request.uri.path.split('/')[2]
    };

    movie.title = $('.film-header__title').text(); // Название
    if ($('.film-header__movie-type')) {
      console.log($('.film-header__movie-type').text());
    }
    movie.alternativeTitle = $('.film-meta__title').text().trim(); // Оригинальное название
    movie.description = $('.film-description .kinoisland__content').text().trim(); // Описание

    if (movie.kinopoisk_id == '34074') {
      movie.genres = 'семейный';
    } else {
      movie.genres = $('.movie-tags').attr('content').trim();
    }
    movie.kinopoisk_rating = $('.rating-button__rating').first().text().trim();

    var table = $('.film-info tr');
    for (var i = 0; i < table.length; i++) {
      var tdName = $($(table[i]).find('td')[0]).text().trim();
      var tdValue = $($(table[i]).find('td')[1]).text().trim();

      switch (tdName) {
        case 'Год производства':
          movie.year = tdValue;
          break;
        case 'Страна':
          movie.countries = tdValue;
          break;
        case 'Время':
          movie.duration = tdValue;
          break;
        case 'Премьера в мире':
          movie.premiere = tdValue;
          break;
        case 'Возраст':
          movie.age = tdValue;
          break;
        case 'IMDb':
          movie.IMDb_rating = tdValue;
          break;
        default:

      }
    }

    saveMovie(movie);
    callback(movie);
  });
};


var getMovie = async(search) => {
  return db.queryAsync('SELECT * FROM `movies` WHERE MATCH (title, alternativeTitle) AGAINST ({search}) LIMIT 15', {
    search: search
  });
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

  console.log(123);
  console.log(userMovieWatch);

  if (userMovieWatch.length) {
    // remove
    await db.queryAsync('DELETE FROM `userMovie` WHERE type = {type} AND userID = {userID} AND movieID = {movieID} LIMIT 1', {
      type: 1,
      movieID: movieID,
      userID: userID
    });
    return false;
  } else {
    console.log(movieID);
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

  let [watch, views] = await Promise.all([
    userGetViews(id, user[0].id),
    userGetWatch(id, user[0].id)
  ]);

  return {
    movie,
    watch,
    views
  };
};

var saveMovie = (data) => {
  data.countries = data.countries;
  data.genres = data.genres;
  data.duration = data.duration;

  var query = 'SELECT * FROM `movies` WHERE type = "' + data.type + '" AND alternativeTitle = "' + data.alternativeTitle + '" AND year = "' + data.year + '"';
  db.query(query, (err, result) => {
    if (err) throw err;

    if (result.length == 0) {
      query = 'INSERT `movies` (type, title, alternativeTitle, countries, genres, duration, year, age, description, premiere, kinopoisk_rating, IMDb_rating, kinopoisk_id) VALUES ("' + data.type + '", "' + data.title + '", "' + data.alternativeTitle + '", "' + data.countries + '", "' + data.genres + '", "' + data.duration + '", "' + data.year + '", "' + data.age + '", "' + data.description + '", "' + data.premiere + '", "' + data.kinopoisk_rating + '", "' + data.IMDb_rating + '", "' + data.kinopoisk_id + '")';

      db.query(query, (err, result) => {
        if (err) throw err;

        console.log(result.insertId);
        console.log('1 record inserted');
      });
    }
  });

}

var getGenres = (callback) => {
  db.queryAsync('SELECT * FROM `genres`')
    .then(function(result) {
      for (var ganre of result) {
        GENRES[ganre.id] = ganre;
      }
      callback();
    })
    .catch(function(error) {
      console.log(error);
    });
}
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

var getCountries = (callback) => {
  db.queryAsync('SELECT * FROM `countries`')
    .then(function(result) {
      for (var countrie of result) {
        COUNTRIES[countrie.id] = countrie;
      }
      callback();
    })
    .catch(function(error) {
      console.log(error);
    });
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

var saveCountrie = (data, callback) => {

}

var updateMovie = (data, callback) => {

}
