var sqlite3 = require('sqlite3');
var config = require("../config.json");
var path = require("path");
module.exports.getBal = function (uid) {
  return new Promise(function (resolve, reject) {
    let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
      if (err) {
        console.error(err.message);
      }
    });
    db.serialize(() => {
      db.get("SELECT * FROM Currency WHERE UserId = $uid", {
        $uid: uid
      }, function (err, row) {
        resolve(row.Amount)
      })
    })
    db.close();
  })
}
module.exports.updateBal = function (uid, amount) {
  return new Promise(function (resolve, reject) {
    let db = new sqlite3.Database(path.join(config.nadeko_db_path), (err) => {
      if (err) {
        console.error(err.message);
      }
    });
    db.serialize(() => {
      db.run("UPDATE Currency SET Amount = ? WHERE UserId = ?2", {
        2: uid,
        1: amount
      })
      resolve()
    })
    db.close();
  })
}
