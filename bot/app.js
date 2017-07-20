const TelegramBot = require('node-telegram-bot-api'),
  request = require('request'),
  database = require('../utils/db'),
  parseDate = require('../utils/parseDate'),
  textUtil = require('../utils/text');

const token = '427137590:AAG3cYR6WSzov9FD7MIGXdi7pTO31kkoLck';
var bot;

const movieApi = 'http://127.0.0.1:8080/';

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
  'pushpin': '\u{1F4CC}',
  'check': '\u{2705}',
  'clapper': '\u{1F3AC}'
};
const replicas = {
  'movieNotFound': emoji.ghost + ' Фильм не найден',
  'error': 'Не в силах('
};

var lastmessage = {};

var waitInputDate = 0; // !! для конкретного пользователя !!!!!!

var KEYBOARD = [
  [{
    text: emoji.clapper + ' Буду смотреть'
  }, {
    text: emoji.check + ' Посмотрел'
  }]
];

// Клавиатуру отправлять один раз

const sendMessage = (chatId, message, options = {}) => {
  var rm = {};

  if (options.keyboard) {
    rm.keyboard = options.keyboard;
  }

  if (options.inline_keyboard) {
    rm.inline_keyboard = options.inline_keyboard;
  }

  console.log(rm);

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: JSON.stringify(rm)
  });
};

const searchMovie = (name, telegramId, callback) => {
  var options = {
    url: movieApi + '?search=' + encodeURI(name) + '&telegramId=' + telegramId
  }
  request.get(options, (err, res, body) => {
    if (err) console.log(err);
    else if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      sendMessage(chatId, replicas.error);
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

const getWatchMovie = (id, telegramId, callback) => {
  var options = {
    url: movieApi + '?watchMovieId=' + id + '&telegramId=' + telegramId
  }
  console.log(id, telegramId);
  request.get(options, (err, res, body) => {
    if (err) console.log(err);
    else if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      sendMessage(chatId, replicas.error);
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

const setWatchMovie = (id, telegramId, callback) => {
  var options = {
    url: movieApi + '?setWatchMovieId=' + id + '&telegramId=' + telegramId
  }
  console.log(id, telegramId);
  request.get(options, (err, res, body) => {
    if (err) console.log(err);
    else if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      sendMessage(chatId, replicas.error);
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

const getMovie = (id, telegramId, callback) => {
  var options = {
    url: movieApi + '?movieId=' + id + '&telegramId=' + telegramId
  }
  request.get(options, (err, res, body) => {
    if (err) console.log(err);
    else if (res.statusCode != 200) {
      console.log('Error status ' + res.statusCode);
      sendMessage(chatId, replicas.error);
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
  db.queryAsync('INSERT messages (chatId, text) VALUES ({chatId}, {text})', {
      chatId: message.chat.id,
      text: message.text
    })
    .then(function(result) {
      console.log('1 record inserted');
    })
    .catch(function(error) {
      console.log(error);
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
    // emoji.hat + ' *Режисёры:* \n' +
    // emoji.actors + ' *Актёры:* \n' +
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



const init = () => {
  bot = new TelegramBot(token, {
    polling: true
  });

  bot.on('callback_query', function(message) {
    console.log(message.data);
    switch (message.data) {
      case 'callback_add_view_cancel':

        break;
      case /^callback_views\d+$/.test(message.data) ? message.data:
        null:
          var movieId = message.data.replace('callback_views', '');
        console.log(movieId);

        waitInputDate = message.id;

        return sendMessage(message.message.chat.id, 'Введите дату просмотра\nНапример: 07.02.2017, вчера или сегодня', {
          keyboard: [
            ['Отмена']
          ]
        });

        break;
      case /^callback_add_view\d+$/.test(message.data) ? message.data:
        null:
          var movieId = message.data.replace('callback_add_view', '');

        waitInputDate = message.id;

        // записываем id сообщения
        // просим ввести дату
        // выводим кнопку отмена
        //

        break;

      case /^callback_watch\d+$/.test(message.data) ? message.data:
        null:
          var movieId = message.data.replace('callback_watch', '');
        console.log(movieId);
        console.log(message.message.text);
        console.log(message.message.entities);

        if (message.message.entities) {
          message.message.text = textUtil.Markdown(message.message.text, message.message.entities);
        }

        setWatchMovie(movieId, message.from.id, (watch) => {
          bot.editMessageText(message.message.text, {
            message_id: message.message.message_id,
            chat_id: message.message.chat.id,
            parse_mode: 'Markdown',
            reply_markup: JSON.stringify({
              inline_keyboard: [
                [{
                  text: 'Посмотрел',
                  callback_data: 'callback_add_view' + movieId
                }, {
                  text: (watch ? emoji.check : '') + 'Буду смотреть',
                  callback_data: 'callback_watch' + movieId
                }]
              ]
            })
          });
        });

        break;
      default:

    }

    bot.answerCallbackQuery(message.id, 'Ok, here ya go!');
  });

  bot.on('message', (message) => {
    messageHandler(message);

    var mes = message.text ? message.text.toLowerCase() : message.text;
    var chatId = message.chat.id;
    var fromId = message.from.id;

    bot.sendChatAction(chatId, 'typing');

    console.log(waitInputDate);

    if (mes == 'отмена') {
      bot.sendChatAction(chatId, 'typing');
      return sendMessage(chatId, 'Ок');
    }

    if (mes == emoji.check + ' посмотрел') {
      bot.sendChatAction(chatId, 'typing');
      return sendMessage(chatId, 'Ок. Посмотрел');
    }

    if (mes == emoji.clapper + ' буду смотреть') {
      bot.sendChatAction(chatId, 'typing');
      return sendMessage(chatId, 'Ок. Буду смотреть');
    }

    if (waitInputDate) {
      let date = parseDate(mes);
      console.log(date);

      // не меньше дата релиза
      // не больше текущая дата

      if (date.date) {
        var options = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        };
        console.log(date.date.toLocaleDateString('ru-RU'), options);
        var text = date.date.getDate() + '.' + date.date.getMonth() + '.' + date.date.getFullYear(); // 2 февраля 2017

        var keyboard = [
          [{
            text: 'Ок'
          }, {
            text: 'Отмена'
          }]
        ];
      } else {
        var text = 'Не верный формат даты';
        var keyboard = [
          [{
            text: 'Ок'
          }, {
            text: 'Отмена'
          }]
        ];
      }

      bot.sendChatAction(chatId, 'typing');
      return sendMessage(chatId, text, {
        keyboard: keyboard
      });
    }

    switch (mes) {
      case '/start':
        bot.sendChatAction(chatId, 'typing');
        sendMessage(chatId, 'Hello!', {
          keyboard: KEYBOARD
        });
        break;
      case /^\/\d+$/.test(mes) ? mes:
        null:
          getMovie(mes.substr(1), fromId, (result) => {
            console.log(result);
            if (result.error) {
              bot.sendChatAction(chatId, 'typing');
              return sendMessage(chatId, replicas.movieNotFound);
            }

            let movie = result.movie;
            let watch = result.watch;
            let views = result.views;
            console.log(formatOneMovie(movie));

            return sendMessage(chatId, formatOneMovie(movie), {
              inline_keyboard: [
                [{
                  text: 'Посмотрел',
                  callback_data: 'callback_add_view' + movie.id
                }, {
                  text: (watch ? emoji.check : '') + 'Буду смотреть',
                  callback_data: 'callback_watch' + movie.id
                }]
              ]
            });
          });
        break;
      default:
        searchMovie(mes, fromId, (result) => {
          console.log(result);
          if (result.error) {
            bot.sendChatAction(chatId, 'typing');
            return sendMessage(chatId, replicas.movieNotFound);
          }

          movie = result;

          if (movie.length > 1) {
            bot.sendChatAction(chatId, 'typing');
            return sendMessage(chatId, formatMovies(movie));
          } else if (movie.length == 1) {
            var watch = false;
            if (movie.watch) watch = true;

            bot.sendChatAction(chatId, 'typing');
            return sendMessage(chatId, formatOneMovie(movie.movie[0]), {
              inline_keyboard: [
                [{
                  text: 'Посмотрел',
                  callback_data: 'callback_add_view' + movie.movie[0].id
                }, {
                  text: (watch ? emoji.check : '') + 'Буду смотреть',
                  callback_data: 'callback_watch' + movie.movie[0].id
                }]
              ]
            });
          } else {
            bot.sendChatAction(chatId, 'typing');
            return sendMessage(chatId, replicas.movieNotFound);
          }
        });
    }
  });
};


const db = database.init(() => {
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
