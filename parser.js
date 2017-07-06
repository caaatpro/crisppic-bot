const request = require('request'),
      fs = require('fs');
// https://st.kp.yandex.net/images/film_big/461.jpg
var links = [];

var parse = (ii) => {
  console.log(ii);
  if (!links[ii]) {
    console.log('End '+ii);
    return;
  }
  var options = {
      url: 'http://127.0.0.1:8080/?url='+links[ii]
  }
  request.get(options, function (err, res, body) {
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

fs.readFile('links', 'utf8', function(err, contents) {
  var l = contents.split('\n');
  for (var i = 0; i < l.length; i++) {
    if (l[i] != '') links.push(l[i]);
  }
  parse(0);
});
