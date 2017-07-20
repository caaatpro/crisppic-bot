module.exports.cleanExtra = (text) => {
  var chars = [
    '\\-',
    '\\!',
    '\\?',
    '\\/',
    '\\+',
    '\\.',
    '\\:',
    '\\(',
    '\\)',
    '\\»',
    '\\«',
    '\\\'',
    '\\"',
    '\\,',
    '\\…',
    '\\`',
    '\\№',
    '\\]',
    '\\[',
    '\\*',
    '\\–'
  ];

  for (var i = 0; i < chars.length; i++) {
    text = text.replace(new RegExp(chars[i], 'g'), ' ');
  }

  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

module.exports.Markdown = (text, entities) => {
  var text2 = text.substr(0, entities[0].offset);
  for (var i = 0; i < entities.length; i++) {
    var tag = '';
    if (entities.type = 'bold') {
      tag = '*';
    }
    text2 += tag + text.substr(entities[i].offset, entities[i].length) + tag;
    if (i < entities.length-1) {
      text2 += text.substring(entities[i].offset+entities[i].length, entities[i+1].offset);
    } else {
      text2 += text.substring(entities[i].offset+entities[i].length, text.length);
    }
  }

  return text2;
};
