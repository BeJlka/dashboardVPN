const EventEmitter = require('events');
const fs = require('fs');
const config = require('./config');

let sh = require('shelljs');
let log = require('./log');

const OVPN = require('./openvpn');

class OpenVPN extends EventEmitter {
  constructor() {
    super();
    this.dir = sh.pwd();
    this.ip = '';
    if (!sh.test('-d', config.dir)) {
      sh.mkdir(config.dir);
    }
    this.ovpn = new OVPN(config.dir);
  }

  async createServer(server, reinstall = false) {
    await this.ovpn.createServer(server);
  }

  async destroyServer(code, service, reserved, server) {
    log.log(`удаляем сервер <${code}>`);
    sh.exec(`systemctl stop openvpn@${code}`);
    sh.exec(`systemctl disable openvpn@${code}`);
    sh.rm('-rf', `/etc/openvpn/${code}*`);
    sh.rm('-rf', `${config.dir}/${code}*`);
    log.success(`сервер <${code}> удалён`);

    log.log(`удаление ${service}@${code}`);
    sh.exec(`systemctl stop ${service}@${code}`);
    sh.exec(`systemctl disable ${service}@${code}`);
    sh.exec(`rm -rf /etc/openvpn/${code}.conf`);
    log.log(`файл сервера <${code}> удален`);
    sh.exec(`rm -rf ${config.dir}/${code}`);
    sh.exec(`rm -rf /etc/openvpn/${code}_client`);
    log.log(config.dir, 'директория очищена');
    sh.exec(`rm -rf /etc/openvpn/${code}`);
    log.log('etc/openvpn', 'директория очищена');

    delete server[code];

    let vpn = reserved.openvpn;
    let number = null;
    let array = [];
    vpn.name.map((item, index) => {
      if (code != item) {
        array.push(item);
      } else {
        number = index - 3;
      }
    });
    vpn.name = array;

    for (const key in vpn) {
      if (key != 'name') {
        array = [];
        vpn[key].map((item, index) => {
          if (index != number) {
            array.push(item);
          }
        });
        vpn[key] = array;
      }
    }

    reserved.openvpn = vpn;
    log.log('успешно');
    return { success: true };
  }

  async startServer(code) {
    log.log(`запускаем сервер <${code}>`);
    sh.exec(`systemctl start openvpn@${code}`);
  }

  async stopServer(code) {
    log.log(`останавливаем сервер <${code}>`);
    sh.exec(`systemctl stop openvpn@${code}`);
  }

  async restartServer(code) {
    log.log(`перезапуск сервера <${code}>`);
    sh.exec(`systemctl restart openvpn@${code}`);
  }

  async genCli(client, server) {
    await this.ovpn.createClient(client, server);
    return null;
  }

  async revokeClient(serverCode, clientCode) {
    log.log(serverCode);
    await this.ovpn.dropClient(serverCode, clientCode);

    let read = fs
      .readFileSync(`${config.dir}/${serverCode}/pki/index.txt`)
      .toString()
      .split('\n');
    read.map((item, index) => {
      if (item.includes(clientCode)) {
        read.splice(index, 1);
      }
    });
    fs.writeFileSync(
      `${config.dir}/${serverCode}/pki/index.txt`,
      read.join('\n')
    );
  }

  blocked(client, server) {
    return this.ovpn.blocked(client, server);
  }
}

module.exports = OpenVPN;
