const request = require('request'),
      fs = require('fs');
// https://st.kp.yandex.net/images/film_big/461.jpg
var links = [];


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

fs.readFile('links', 'utf8', (err, contents) => {
  var l = contents.split('\n');
  for (var i = 0; i < l.length; i++) {
    if (l[i] != '') links.push(l[i]);
  }
  parse(0);
});
