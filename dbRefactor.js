const database = require('./utils/db'),
  parseDate = require('./utils/parseDate'),
  textUtil = require('./utils/text');
require('./utils/date')();

const db = database.init(() => {});
db.config.queryFormat = function(query, values) {
  return query.replace(/\{(\w+)\}/g, function(txt, key) {
    if (values.hasOwnProperty(key)) {
      return this.escape(values[key]);
    }
    return txt;
  }.bind(this));
};

var movies;
var GENRES = {};

var saveCountries = async(title) => {
  let c = await db.queryAsync('SELECT id FROM `countries` WHERE title = {title} LIMIT 1', {
    title: title.trim()
  });
  if (c.length) {
    return c[0].id;
  }
  let c2 = await db.queryAsync('INSERT `countries` (title, alternativeTitle) VALUES ({title}, {alternativeTitle})', {
    title: title.trim(),
    alternativeTitle: ''
  });


  return c2.insertId;
};

var getGenres = async() => {
  let result = await db.queryAsync('SELECT * FROM `genres`');

  for (var ganre of result) {  console.log(ganre.id);
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
};

var updateMovie = async(mid) => {
  var movie = movies[mid];
  var t = movie.genres;

  if (movie.premiere != '' && !/^-?\d+$/.test(movie.premiere)) {
    movie.premiere = parseDate((movie.premiere)).date.getUnixTime();
  }
  if (movie.duration != '' && !/^\d+$/.test(movie.duration)) {
    var d = movie.duration;
    if (d.indexOf('час') != -1 && d.indexOf('мин') != -1) {
      var reg = /(\d+)[а-яА-Я\s]+(\d+)/
      var match = d.match(reg);
      movie.duration = parseInt(match[1]) * 60 + parseInt(match[2]);
    } else {
      var reg = /(\d+)[а-яА-Я\s]/
      if (reg.test(d)) {
        var match = d.match(reg);
        movie.duration = parseInt(match[1]);
      }

      if (d.indexOf('час') != -1) {
        movie.duration = movie.duration * 60;
      }
    }

    var search = movie.title;
    if (movie.title != movie.alternativeTitle) {
      search += ' '+movie.alternativeTitle;
    }

    movie.search = textUtil.cleanExtra(search)
  }

  var tempCountries = movie.countries;
  movie.countries = [];
  if (tempCountries != '') {
    tempCountries = tempCountries.split(', ');

    for (var i = 0; i < tempCountries.length; i++) {
      let id = await saveCountries(tempCountries[i]);
      movie.countries.push(id);
    }
  }

  var tempGenre = movie.genres;
  movie.genres = [];
  if (tempGenre != '') {
    tempGenre = tempGenre.split(', ');

    for (var i = 0; i < tempGenre.length; i++) {
      let id = getGenre(tempGenre[i]);
      if (id != 0) {
        movie.genres.push(id);
      }
    }
  }

  let update = await db.queryAsync('UPDATE movies SET genres = {genres}, countries = {countries}, search = {search}, duration = {duration}, premiere = {premiere} WHERE id = {id};', {
    id: movie.id,
    genres: movie.genres.join(','),
    countries: movie.countries.join(','),
    search: movie.search,
    duration: movie.duration,
    premiere: movie.premiere
  });

  // console.log(update);
  console.log(movie.id);

  if (movies.length-1 > mid) {
    updateMovie(mid+1);
  } else {
    console.log('Всё!');
  }
};

getGenres().then(()=> {
  db.queryAsync('SELECT * FROM `movies` WHERE search = ""')
    .then((result) => {
      movies = result;
      updateMovie(0);
    });
});
