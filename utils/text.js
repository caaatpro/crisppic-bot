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
