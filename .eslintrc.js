module.exports = {
    "parserOptions": {
      "ecmaVersion": 6,
      "sourceType": "module",
      "ecmaFeatures": {
          "jsx": true,
          "modules": false,
          "experimentalObjectRestSpread": true
      }
    },
    "env": {
        "es6": true,
        "node": true
    },
    // "extends": "eslint:recommended",
    "rules": {
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ]
    }
};
