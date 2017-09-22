const request = require('request'),
      fs = require('fs'),
      http = require('http'),
      url = require('url'),
      morgan = require('morgan'),
      TorControl = require('tor-control'),
      cheerio = require('cheerio'),
      Agent = require('socks5-https-client/lib/Agent'),
      database = require('./utils/db'),
      textUtil = require('./utils/text');

// https://st.kp.yandex.net/images/film_big/461.jpg
var links = [];
var logger = morgan('combined');

const config = {
  port: 8080
};

var GENRES = {},
  COUNTRIES = {};

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

const db = database.init(() => {
  getGenres().then(() => {
    console.log('Genres ok');
  });
  getCountries().then(() => {
    console.log('Countries ok');
  });

});

var getMovieByUrl = (url, callback) => {
  // Movie
  var options = {
    url: url,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:52.0) Gecko/20100101 Firefox/52.0"'
    },
    // strictSSL: true,
    agentClass: Agent,
    agentOptions: {
      socksHost: '67.205.191.44',
      socksPort: '8080'
    },
    encoding: 'utf-8'
  };

  console.log('request');

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

    console.log(res.request.uri.path);

    if ($('title').text() == 'КиноПоиск.ru') {
      console.log('Блин!');


      // return getMovieByUrl(url, callback);

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

    movie.genres = $('.movie-tags').attr('content').trim();

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

var saveMovie = (data) => {
  data.countries = data.countries;
  data.genres = data.genres;
  data.duration = data.duration;

  var query = 'SELECT * FROM `movies` WHERE type = "' + data.type + '" AND alternativeTitle = "' + data.alternativeTitle + '" AND year = "' + data.year + '"';
  db.query(query, (err, result) => {
    if (err) throw err;

    if (result.length == 0) {
      query = 'INSERT `movies` (type, '+
                              'title, '+
                              'alternativeTitle, '+
                              'countries, '+
                              'genres, '+
                              'duration, '+
                              'year, '+
                              'age, '+
                              'description, '+
                              'premiere, '+
                              'kinopoisk_rating, '+
                              'IMDb_rating, '+
                              'kinopoisk_id'+
                            ') VALUES ("'+
                                data.type + '", "' +
                                data.title + '", "' +
                                data.alternativeTitle + '", "' +
                                data.countries + '", "' +
                                data.genres + '", "' +
                                data.duration + '", "' +
                                data.year + '", "' +
                                data.age + '", "' +
                                data.description + '", "' +
                                data.premiere + '", "' +
                                data.kinopoisk_rating + '", "' +
                                data.IMDb_rating + '", "' +
                                data.kinopoisk_id + '")';

      db.query(query, (err, result) => {
        if (err) throw err;

        console.log(result.insertId);
        console.log('1 record inserted');
      });
    }
  });

};

var parse = (ii) => {
  console.log(ii);
  if (!links[ii]) {
    console.log('End '+ii);
    return;
  }
  var options = {
      url: 'http://127.0.0.1:8080/?url='+links[ii]
  }
  request.get(options, (err, res, body) => {
      if (err) {
        console.log(err);
        if (err.code == 'ECONNRESET') {
          return parse(ii);
        }
      }
      else if (res.statusCode != 200) {
        console.log('Error status '+res.statusCode);
        return;
      } else {
        console.log(JSON.parse(body));
        if (JSON.parse(body) == 'bad') {
          console.log(chatId, 'Не в силах(');
          return;
        }

        var movie = JSON.parse(body);

        var text = '*' + movie.title + '* ' + movie.year + '\n'
        + movie.alternativeTitle;

        console.log(text);
        return parse(ii+1);
      }
  });
}

var fromFile = (name) => {
  fs.readFile(name, 'utf8', (err, contents) => {
    var l = contents.split('\n');
    for (var i = 0; i < l.length; i++) {
      if (l[i] != '') links.push(l[i]);
    }
    parse(0);
  });
}

http.createServer((req, res) => {
  logger(req, res, function (err) {
    if (err) console.log(err);

    var queryData = url.parse(req.url, true).query;
    res.writeHead(200, {
      'Content-Type': 'text/plain'
    });

    if (queryData.url) {
      getMovieByUrl(queryData.url, (result) => {

        res.end(JSON.stringify(result));
      });
    } else {
      res.end('hello, world!')
    }
  })
}).listen(config.port);
console.log('Server listening at port %d', config.port);
