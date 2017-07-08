const request = require('request'),
      cheerio = require('cheerio'),
      iconv = require('iconv-lite');
      mysql = require('mysql'),
      http = require('http'),
      url = require('url'),
      TorControl = require('tor-control');

const db = mysql.createConnection({
  host: '89.223.29.88',
  user: 'movies',
  password: 'i48mAtrgcV9BRjNn',
  database: 'movies'
});

db.config.queryFormat = function (query, values) {
  if (!values) return query;
  return query.replace(/\{(\w+)\}/g, function (txt, key) {
    if (values.hasOwnProperty(key)) {
      return this.escape(values[key]);
    }
    return txt;
  }.bind(this));
};

var newCircuit = false;

var control = new TorControl(),
    Agent = require('socks5-https-client/lib/Agent');

var GENRES = {},
    COUNTRIES = {};

var inits = 2;

var init = () => {
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

db.connect(function(err) {
  if (err) {
    throw err;
    process.exit();
  }
  console.log('DB Connected!');

  init();
});


http.createServer(function (request, response) {
  var queryData = url.parse(request.url, true).query;
  response.writeHead(200, {'Content-Type': 'text/plain'});

  if (queryData.url) {
    console.log(decodeURI(queryData.url));

    getMovieByUrl(decodeURI(queryData.url), (result) => {
      response.end(JSON.stringify(result));
    });
  } else if (queryData.search) {
    console.log(queryData.search);
    console.log(decodeURI(queryData.search));
    getMovie(decodeURI(queryData.search), (result) => {
      console.log(result);
      response.end(JSON.stringify(result));
    });
  }

  /*console.log(queryData.title);
  queryData.title = decodeURI(queryData.title);
  console.log(queryData.title);

  if (queryData.title) {
    getMovie(queryData.title, function (result) {
      console.log(result[0]);
      if (result.length) {
        response.end(JSON.stringify(result[0]));
      } else {
        response.end('Фильм не найден');
      }
    });

  } else {
    console.log('Фильм не найден');
  }*/
}).listen(8080);

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

  request(options, function (err, res, body) {
      if (err) {
        console.log(err);
        return getMovieByUrl(url, callback);
      }

      if (res.statusCode != 200) {
        console.log('Error status '+res.statusCode);
        return;
      }

      $ = cheerio.load(body);

      if ($('title').text() == 'КиноПоиск.ru') {
        console.log('Блин!');

        if (newCircuit) {
          return getMovieByUrl(url, callback);
        } else {
          newCircuit = true;
          control.signalNewnym(function(err, status) { // Get a new circuit
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
        'year' : '',
        'countries' : '',
        'genres' : '',
        'duration' : '',
        'premiere' : '',
        'description' : '',
        'kinopoisk_rating' : '',
        'IMDb_rating' : '',
        'age' : '',
        'kinopoisk_id' : res.request.uri.path.split('/')[2]
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

// Search
/*var options = {
    url: 'https://www.kinopoisk.ru/s/type/film/list/1/find/%E3%E0%E4%EA%E8%E9/',
    encoding: null
}*/
/*
request(options, function (err, res, body) {
    if (err) throw err;
    if (res.statusCode != 200) {
      return;
    }

    $ = cheerio.load(iconv.decode(body, 'win1251'));

    var elements = $('#block_left_pad .element');
    for (var i = 0; i < elements.length; i++) {
      var e = $(elements[i]).find('.name>a')
      // console.log(e.text());
      // console.log(e.data('url'));
    }
});*/

var queryLog = (query, result, 	err) => {
  if (err == null) {
    error = 0;
  } else {
    error = 1;
  }

  db.query('INSERT `querylogs` (text, result, error) VALUES ({text}, {result}, {error})', { text: query, result: result, error: error }, function(err, result) {
    if (err) throw err;

    console.log(result);
  });
}


function getMovie(search, callback) {
  db.query('SELECT * FROM `movies` WHERE MATCH (title, alternativeTitle) AGAINST ({search}) LIMIT 1', { search: search }, function(err, result) {
    if (err) throw err;

    queryLog(this.sql, result.length, err);

    callback(result);
  });
}

function saveMovie(data) {
  data.countries = data.countries;
  data.genres = data.genres;
  data.duration = data.duration;

  var query = 'SELECT * FROM `movies` WHERE type = "'+data.type+'" AND alternativeTitle = "'+data.alternativeTitle+'" AND year = "'+data.year+'"';
  db.query(query, function(err, result) {
    if (err) throw err;

    if (result.length == 0) {
      query = 'INSERT `movies` (type, title, alternativeTitle, countries, genres, duration, year, age, description, premiere, kinopoisk_rating, IMDb_rating, kinopoisk_id) VALUES ("'+data.type+'", "'+data.title+'", "'+data.alternativeTitle+'", "'+data.countries+'", "'+data.genres+'", "'+data.duration+'", "'+data.year+'", "'+data.age+'", "'+data.description+'", "'+data.premiere+'", "'+data.kinopoisk_rating+'", "'+data.IMDb_rating+'", "'+data.kinopoisk_id+'")';

      db.query(query, function(err, result) {
        if (err) throw err;

        console.log(result.insertId);
        console.log('1 record inserted');
      });
    }
  });

}

function getGenres(callback) {
  var query = 'SELECT * FROM `genres`';
  db.query(query, function(err, result) {
    if (err) throw err;

    for (var ganre of result) {
      GENRES[ganre.id] = ganre;
    }
    callback();
  });
}
function getGenre(name) {
  for (var key in GENRES) {
    if (GENRES.hasOwnProperty(key)) {
      if (GENRES[key].ru == name || GENRES[key].en == name) {
        return GENRES[key].id;
      }
    }
  }

  return 0;
}

function getCountries(callback) {
  var query = 'SELECT * FROM `countries`';
  db.query(query, function(err, result) {
    if (err) throw err;

    for (var countrie of result) {
      COUNTRIES[ganre.id] = countrie;
    }
    callback();
  });
}
function getCountrie(name) {
  for (var key in COUNTRIES) {
    if (COUNTRIES.hasOwnProperty(key)) {
      if (COUNTRIES[key].ru == name || COUNTRIES[key].en == name) {
        return COUNTRIES[key].id;
      }
    }
  }

  return 0;
}

function saveCountrie(data, callback) {

}

function updateMovie(data, callback) {

}
