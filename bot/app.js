const TelegramBot = require('node-telegram-bot-api'),
  request = require('request'),
  database = require('../utils/db');

const token = '427137590:AAG3cYR6WSzov9FD7MIGXdi7pTO31kkoLck';
var bot;

var lastMessage;

const emoji = {
  'clock': '\u{1F553}',
  'page': '\u{1F4C4}',
  'globe': '\u{1F310}',
  'calendar': '\u{1F4C5}',
  'star': '\u{2B50}',
  'hat': '\u{1F3A9}',
  'ticket': '\u{1F3AB}',
  'actors': '\u{1F3AD}',
  'ghost': '\u{1F47B}',
  'pushpin': '\u{1F4CC}'
};


var lastmessage = {};

const searchMovie = (name, callback) => {
  var options = {
    url: 'http://127.0.0.1:8080/?search=' + encodeURI(name)
  }
  request.get(options, (err, res, body) => {
    if (err) console.log(err);
    else if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      bot.sendMessage(chatId, 'Error :(');
      return;
    } else {
      if (JSON.parse(body) == 'bad') {
        return callback('bad');
      }

      var movie = JSON.parse(body);

      return callback(movie);
    }
  });
};

const getMovie = (id, callback) => {
  var options = {
    url: 'http://127.0.0.1:8080/?movieId=' + id
  }
  request.get(options, (err, res, body) => {
    if (err) console.log(err);
    else if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      bot.sendMessage(chatId, 'Error :(');
      return;
    } else {
      if (JSON.parse(body) == 'bad') {
        return callback('bad');
      }

      var movie = JSON.parse(body);

      return callback(movie);
    }
  });
};

const userSave = (message) => {
  var telegramId = message.from.id;
  db.query('SELECT * FROM `users` WHERE telegramId = {telegramId} LIMIT 1', {
    telegramId: telegramId
  }, (err, result) => {
    if (err) throw err;
    // database.queryLog(this.sql, result.length, err);

    if (result.length == 0) {
      var first_name = message.from.first_name;
      var last_name = message.from.last_name;
      var username = message.from.username;
      var telegram_language = message.from.language_code;

      db.query('INSERT `users` (telegramId, first_name, last_name, username, telegram_language) VALUES ({telegramId}, {first_name}, {last_name}, {username}, {telegram_language})', {
          telegramId: telegramId,
          first_name: first_name,
          last_name: last_name,
          username: username,
          telegram_language: telegram_language
        },
        (err, result) => {
          if (err) throw err;

          console.log(result);
        });
    }


  });
};

const messageHandler = (message) => {
  lastmessage[message.chat.id] = message.text;
  userSave(message);

  // message log
  var query = 'INSERT messages (chatId, text) VALUES ("' + message.chat.id + '", "' + message.text + '")';
  db.query(query, (err, result) => {
    if (err) throw err;

    console.log('1 record inserted');
  });
};


const dbRequest = (query, callback) => {
  // Защита от иньекций
  // Обработка ошибок
  // Лог ошибок
};

const logErrors = () => {

};


const formatOneMovie = (movie) => {
  return emoji.ticket + ' *' + movie.title + '* ' + movie.year + '\n' +
    movie.alternativeTitle + '\n' +
    emoji.calendar + ' *Примьера:* ' + movie.premiere + '\n' +
    emoji.globe + ' *Страны:* ' + movie.countries + '\n' +
    emoji.clock + ' *Длительность:* ' + movie.duration + '\n' +
    emoji.pushpin + ' *Жанры:* ' + movie.genres + '\n' +
    emoji.hat + ' *Режисёры:* \n' +
    emoji.actors + ' *Актёры:* \n' +
    emoji.star + ' *Кинопоиск:* ' + movie.kinopoisk_rating + ' *IMDb:* ' + movie.IMDb_rating + ' \n' +
    emoji.hat + ' ' + movie.description;
}
const formatMovies = (movies) => {
  var text = '';
  for (var id in movies) {
    if (movies.hasOwnProperty(id)) {
      text += emoji.ticket + ' ' + movies[id].title + ' (' + movies[id].year + ') /' + movies[id].id + '\n';
    }
  }
  return text;
}
var iii = 0;
const init = () => {
  bot = new TelegramBot(token, {
    polling: true
  });

  bot.on('callback_query', function(msg) {
    console.log(msg.message.message_id);
    console.log(msg.message.chat.id);
    iii++;

    bot.editMessageText(msg.message.text, {
      message_id: msg.message.message_id,
      chat_id: msg.message.chat.id,
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{
            text: 'Посмотрел (' + iii + ')',
            callback_data: '1'
          }, {
            text: emoji.calendar + 'Буду смотреть',
            callback_data: 'data 2'
          }]
        ]
      })
    });

    bot.answerCallbackQuery(msg.id, 'Ok, here ya go!');
  });

  bot.on('message', (message) => {
    var chatId = message.chat.id;

    console.log(message.text);

    switch (message.text) {
      case '/start':
        messageHandler(message);

        bot.sendMessage(chatId, 'Hello!', {
          caption: 'I\'m a bot!'
        });
        break;
      case /^\/\d+$/.test(message.text) ? message.text:
        null:
          messageHandler(message);


        getMovie(message.text.substr(1), (movie) => {
          if (movie == 'bad') {
            return bot.sendMessage(chatId, 'Не в силах(');
          }

          console.log(movie.length);

          if (movie.length) {
            return bot.sendMessage(chatId, formatOneMovie(movie[0]), {
              parse_mode: 'Markdown',
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{
                    text: 'Посмотрел',
                    callback_data: '1'
                  }, {
                    text: 'Буду смотреть',
                    callback_data: 'data 2'
                  }]
                ]
              })
            });
          } else {
            return bot.sendMessage(chatId, emoji.ghost + ' Фильм не найден');
          }
        });
        break;
      default:
        messageHandler(message);

        searchMovie(message.text, (movie) => {
          if (movie == 'bad') {
            return bot.sendMessage(chatId, 'Не в силах(');
          }

          console.log(movie.length);

          if (movie.length > 1) {
            return bot.sendMessage(chatId, formatMovies(movie), {
              parse_mode: 'Markdown'
            });
          } else if (movie.length == 1) {
            return bot.sendMessage(chatId, formatOneMovie(movie[0]), {
              parse_mode: 'Markdown',
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{
                    text: 'Посмотрел',
                    callback_data: '1'
                  }, {
                    text: 'Буду смотреть',
                    callback_data: 'data 2'
                  }]
                ]
              })
            });
            /*.then(
              result => {
                console.log(result);
              }
            );*/

            // lastMessage;
          } else {
            return bot.sendMessage(chatId, emoji.ghost + ' Фильм не найден');
          }
        });
    }
  });
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
