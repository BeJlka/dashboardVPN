const chalk = require("chalk");

class Log {
  // constructor() {
  //   this.buffer = [];
  // }
  // async buff() {
  //   let ret = await JSON.parse(JSON.stringify(this.buffer));
  //   //let ret = this.buffer;
  //   this.buffer = [];
  //   console.log("ret: ", ret);
  //   return ret;
  // }
  log(key, msg = null) {
    if (!msg) {
      msg = key;
      key = "..";
    }
    // this.buffer.push({
    //   type: "log",
    //   key: key,
    //   msg: msg,
    // });
    console.log(
      //chalk.white(Date().toString()) +
      `${chalk.blue(`[${key }]`)} ${chalk.dim(msg)}`
    );
  }
  test(key, msg = null) {
    if (!msg) {
      msg = key;
      key = "??";
    }
    // this.buffer.push({
    //   type: "test",
    //   key: key,
    //   msg: msg,
    // });
    console.log(
      //chalk.white(Date().toString()) +
      `${chalk.yellow(`[${key }]`)} ${chalk.dim(msg)}`
    );
  }
  error(key, msg = null) {
    if (!msg) {
      msg = key;
      key = "!!";
    }
    // this.buffer.push({
    //   type: "error",
    //   key: key,
    //   msg: msg,
    // });
    console.log(
      //chalk.white(Date().toString()) +
      `${chalk.red(`[${key }]`)} ${chalk.dim(msg)}`
    );
  }
  success(key, msg = null) {
    if (!msg) {
      msg = key;
      key = "ok";
    }
    // this.buffer.push({
    //   type: "success",
    //   key: key,
    //   msg: msg,
    // });
    console.log(
      //chalk.white(Date().toString()) +
      `${chalk.green(`[${key }]`)} ${chalk.dim(msg)}`
    );
  }
}

let log = new Log();

module.exports = log;
