const request = require('request'),
      fs = require('fs'),
      url = require('url'),
      cheerio = require('cheerio'),
      Agent = require('socks5-https-client/lib/Agent'),
      database = require('./db'),
      textUtil = require('./text');

// https://st.kp.yandex.net/images/film_big/461.jpg
var links = [];

const db = database.init(() => {

});

var getMovieByUrl = (kinopoiskId, callback) => {
  // Movie
  var options = {
    url: 'https://plus.kinopoisk.ru/film/'+kinopoiskId+'/',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:52.0) Gecko/20100101 Firefox/52.0"'
    },
    // strictSSL: true,
    agentClass: Agent,
    agentOptions: {
      socksHost: '188.213.168.123',
      socksPort: '8975'
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

module.exports.getMovieByUrl = getMovieByUrl;
