const EventEmitter = require('events');
const fs = require('fs');

let sh = require('shelljs');
let log = require('./log');

class Mosquitto extends EventEmitter {
  constructor(config) {
    super();

    this.config = config;
    this.dir = '/etc/mosquitto/';
    this.passConf = `${this.dir}password.conf`;
    this.temp = `${this.dir}temp.txt`;
    this.mosqConf = `${this.dir}mosquitto.conf`;
  }

  async create(code, server, password, reserved) {
    log.log('создание клиента  mosquitto');
    let state = false;
    reserved.mosquitto.name.map((item) => {
      if (item === code) state = true;
    });
    if (state) {
      log.log('имя занято');
      return {
        success: false,
        message: 'Имя занято. Введите другое.',
      };
    }
    sh.exec(`touch ${this.temp}`);
    await this.createClientMosquitto(code, password);

    let readFs = fs.readFileSync(this.temp).toString();
    if (!sh.test('-f', this.passConf)) {
      sh.exec(`touch ${this.passConf}`);
      let readConfig = fs.readFileSync(this.mosqConf).toString();
      if (!readConfig.includes('password_file')) {
        fs.writeFileSync(
          this.mosqConf,
          `${readConfig}\npassword_file ${this.passConf}\n`
        );
      }
    }

    let readConfig = fs.readFileSync(this.passConf).toString();

    reserved.mosquitto.name.push(readFs.split(':')[0]);
    sh.exec(`rm -rf ${this.temp}`);
    fs.appendFileSync('/etc/mosquitto/aclfile.example', `\nuser ${code}`);
    fs.writeFileSync(this.passConf, `${readConfig}${readFs.split('\n')[0]}\n`);
    sh.exec(`systemctl restart ${server}`);
    log.success('клиент создан');
    return { success: true };
  }

  createClientMosquitto(name, password) {
    return new Promise((resolt, reject) => {
      sh.cd(this.dir);
      let consoleOne = sh.exec(
        `mosquitto_passwd -c ${this.temp} ${name}`,
        { silent: true, async: true },
        (code, stdout, stderr) => {
          resolt(code);
        }
      );
      consoleOne.stdout.on('data', (data) => {
        data.split('\n').forEach((e) => {
          if (e.startsWith('Password:'))
            consoleOne.stdin.write(password + '\n');
        });
      });
      consoleOne.stdout.on('data', (data) => {
        data.split('\n').forEach((e) => {
          if (e.startsWith('Reenter password'))
            consoleOne.stdin.write(password + '\n');
        });
      });
    });
  }

  clientList(data, server) {
    if (data.includes('@')) {
      data = data.split('@')[1];
      return { success: true, data: server[data].clientList };
    } else {
      sh.cd(this.dir);
      if (!sh.test('-f', this.passConf)) {
        return { success: false, data: 'FILE_NOT_FOUND' };
      }
      let array = [];
      fs.readFileSync(this.passConf)
        .toString()
        .split('\n')
        .map((item) => {
          if (item != '') {
            array.push(item.split(':')[0]);
          }
        });
      return { success: true, data: array };
    }
  }

  clear() {
    sh.exec(`rm -rf ${this.passConf}`);
    log.log(`${this.passConf}`, 'удален');

    let read = fs.readFileSync(this.mosqConf).toString();
    if (read.includes('password_file')) {
      let array = [];
      read.split('\n').map((item, index, arr) => {
        if (index < arr.length - 2) {
          array.push(item);
        }
      });
      fs.writeFileSync(this.mosqConf, array.join('\n'));
      log.log(`${this.mosqConf}`, 'файл очищен');
    }

    read = fs
      .readFileSync('/etc/mosquitto/aclfile.example')
      .toString()
      .split('\n')
      .filter((index) => index < 10);
    fs.writeFileSync('/etc/mosquitto/aclfile.example', read.join('\n'));
  }

  delete(data, reserved) {
    let array = [];
    fs.readFileSync(this.passConf)
      .toString()
      .split('\n')
      .map((item) => {
        if (item.split(':')[0] !== data && item !== '') {
          array.push(item);
        }
      });
    fs.writeFileSync(this.passConf, array.join('\n') + '\n');
    let arrayRes = reserved.mosquitto.name.filter(
      (item, index) => item !== data
    );

    let state = 'none';
    array = [];
    fs.readFileSync('/etc/mosquitto/aclfile.example')
      .toString()
      .split('\n')
      .map((item) => {
        if (item == `user ${data}` && state == 'none') {
          state = 'success';
        } else if (state == 'success' && item.includes('topic')) {
          console.log('topic');
        } else if (state == 'success' && item.includes('user')) {
          state = 'none';
          array.push(item);
        } else {
          array.push(item);
        }
      });
    fs.writeFileSync('/etc/mosquitto/aclfile.example', array.join('\n'));
    return { success: true, data: arrayRes };
  }
}
module.exports = Mosquitto;
