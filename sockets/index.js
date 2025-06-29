// module.exports = function(io) {
//   require("./chess")(io);
//   require("./checkers")(io);
// };

// sockets/index.js
module.exports = io => {
  require("./chess")(io);
  require("./checkers")(io);
};
