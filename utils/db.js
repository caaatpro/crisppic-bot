const mysql = require('mysql');

var db;

module.exports.init = (callback) => {
  console.log(1);
  db = mysql.createConnection({
    host: '89.223.29.88',
    user: 'movies',
    password: 'i48mAtrgcV9BRjNn',
    database: 'movies'
  });


  db.connect((err) => {
    if (err) {
      throw err;
      process.exit();
    }
    console.log('DB Connected!');

    callback();
  });

  return db;
};

module.exports.queryLog = (query, result, err) => {
  if (err == null) {
    error = 0;
  } else {
    error = 1;
  }

  this.db.query('INSERT `querylogs` (text, result, error) VALUES ({text}, {result}, {error})', { text: query, result: result, error: error }, (err, result) => {
    if (err) throw err;

    console.log(result);
  });
};
