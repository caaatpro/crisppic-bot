module.exports = () => {
  Date.prototype.getUnixTime = function() {
    return this.getTime() / 1000 | 0
  };
}
