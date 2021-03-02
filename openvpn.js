const fs = require('fs');
const sh = require('shelljs');

let ip = require('ip');
let log = require('./log');

class OpenVPN {
  constructor(path) {
    this.dir = sh.pwd();
    this.path = `${path}/`;
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path);
    }
  }

  async blocked(client, server) {
    let pathBlocked = `${config.dir}/${client.server}/pki/bloked`;
    let pathUnBlocked = `${config.dir}/${client.server}/pki/certs_by_serial`;
    let fileName;
    if (!fs.existsSync(pathBlocked)) {
      fs.mkdirSync(pathBlocked);
    }

    let read = fs
      .readFileSync(`${config.dir}/${client.server}/pki/index.txt`)
      .toString()
      .split('\n');

    if (client.blocked) {
      let date = new Date();
      let options = {
        timeZone: 'UTC',
        hour12: false,
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      date = date.toLocaleString('en-US', options);
      let array = date.split(',');
      let dateStr = array.shift().split('/');
      date = `${dateStr[2]}${dateStr[0]}${dateStr[1]}${
        array.shift().split(':').join('').split(' ')[1]
      }Z`;
      read.map((item, index) => {
        if (item.includes(client.code)) {
          item = item.split('\t');
          item[0] = 'R';
          item[2] = date;
          fileName = item[3];
          read[index] = item.join('\t');
        }
      });

      sh.exec(`mv ${pathUnBlocked}/${fileName}.pem ${pathBlocked}`, {
        silent: true,
      });
    } else {
      read.map((item, index) => {
        if (item.includes(client.code)) {
          item = item.split('\t');
          item[0] = 'V';
          item[2] = '';
          fileName = item[3];
          read[index] = item.join('\t');
        }
      });

      sh.exec(`mv ${pathBlocked}/${fileName}.pem  ${pathUnBlocked}`, {
        silent: true,
      });
    }

    fs.writeFileSync(
      `${config.dir}/${client.server}/pki/index.txt`,
      read.join('\n')
    );

    server[client.server].clientList.map((item, index) => {
      if (item.code === client.code) {
        server[client.server].clientList[index] = client;
      }
    });

    sh.cd(`${config.dir}/${client.server}`);
    sh.exec(`./easyrsa gen-crl`, { silent: true });
    sh.cp(
      `${config.dir}/${client.server}/pki/crl.pem`,
      `/etc/openvpn/${client.server}`
    );
    sh.exec(`systemctl reload openvpn@${client.server}`, { silent: true });

    return { success: true };
  }

  async destroy(code, service, reserved, server) {
  }

  dropClient(server, client) {
    return new Promise((resolt, reject) => {
      sh.cd(this.path + server);
      log.log('Отзыв клиента', [server, client]);
      log.log(`${this.path}${server}/easyrsa revoke ${client}`);
      let consoleOne = sh.exec(
        `${this.path}${server}/easyrsa revoke ${client}`,
        {
          silent: true,
        },
        async (codeOne, stdoutOne, stderrOne) => {
          await this.updateCrl(server);
          resolt(codeOne);
        }
      );
      consoleOne.stdout.on('data', (data) => {
        data.split('\n').forEach((e) => {
          if (e.includes('Continue with revocation')) {
            consoleOne.stdin.write('yes\n');
          }
        });
      });
    });
  }

  async createClient(client, server) {
    log.log('Создание клиента', [server, client]);
    await this.genClientCerts(server, client);
    log.log('Генерация файла ovpn', client);
    sh.exec(`${this.path}${server}_client/client.sh ${client}`);
    log.log('Обновление crl', server);
    await this.updateCrl(server);
    log.success('Готово');
  }

  genClientCerts(server, client) {
    return new Promise((resolt, reject) => {
      let dir = this.path + server;
      sh.cd(dir);
      let consoleOne = sh.exec(
        `./easyrsa gen-req ${client} nopass`,
        {
          silent: true,
          async: true,
        },
        (code, stdout, stderr) => {
          let consoleTwo = sh.exec(
            `./easyrsa sign-req client ${client}`,
            {
              silent: true,
              async: true,
            },
            (codeTwo, stdoutTwo, stderrTwo) => {
              resolt(codeTwo);
            }
          );
          consoleTwo.stdout.on('data', (data) => {
            data.split('\n').forEach((e) => {
              if (e.includes('Confirm request details'))
                consoleTwo.stdin.write('yes\n');
            });
          });
        }
      );
      consoleOne.stderr.on('data', (data) => {
        data.split('\n').forEach((e) => {
          if (e.startsWith('Common Name (eg:')) consoleOne.stdin.write('\n');
        });
      });
    });
  }

  async updateCrl(server) {
    sh.cd(this.path + server);
    sh.exec('./easyrsa gen-crl', {
      silent: true,
    });
    sh.cp(`${this.path}${server}/pki/crl.pem`, `/etc/openvpn/${server}`);
    sh.exec(`systemctl restart openvpn@${server}`, {
      silent: true,
    });
  }

  async createServer(config) {
    log.log('Создание сервера');
    let dir = this.path + config.code;
    if (fs.existsSync(dir)) {
      log.log('Остановка сервера', config.code);
      sh.exec(`systemctl stop openvpn@${config.code}`);
      log.log('Удаление');
      sh.exec(`rm -rf ${dir}`);
    }
    fs.mkdirSync(dir);
    sh.cd(dir);
    sh.cp('-r', '/usr/share/easy-rsa/*', dir);

    log.log('Настройка конфига');
    await this.buildVars(config);
    log.log('Инициализация Pki');
    await this.initPki(config);
    log.log('Генерация сертификата');
    await this.genServCerts(config);
    log.log('Копирование сертификата');
    await this.cpServCerts(config);
    log.log('Копирование конфигурации');
    await this.genServConf(config);
    log.log('Создание клентского скрипта');
    await this.genServClient(config);

    log.log('Старт сервера');
    sh.exec(`systemctl start openvpn@${config.code}`);
    log.success('сервер запущен');
  }

  async buildVars(config) {
    let dir = this.path + config.code;
    sh.cd(dir);
    sh.cp('vars.example', 'vars');
    sh.sed(
      '-i',
      '#set_var EASYRSA_REQ_COUNTRY',
      'set_var EASYRSA_REQ_COUNTRY',
      'vars'
    );
    sh.sed(
      '-i',
      '#set_var EASYRSA_REQ_PROVINCE',
      'set_var EASYRSA_REQ_PROVINCE',
      'vars'
    );
    sh.sed(
      '-i',
      '#set_var EASYRSA_REQ_CITY',
      'set_var EASYRSA_REQ_CITY',
      'vars'
    );
    sh.sed('-i', '#set_var EASYRSA_REQ_ORG', 'set_var EASYRSA_REQ_ORG', 'vars');
    sh.sed(
      '-i',
      '#set_var EASYRSA_REQ_EMAIL',
      'set_var EASYRSA_REQ_EMAIL',
      'vars'
    );
    sh.sed('-i', '#set_var EASYRSA_REQ_OU', 'set_var EASYRSA_REQ_OU', 'vars');

    sh.sed('-i', 'US', config.certification.country, 'vars');
    sh.sed('-i', 'California', config.certification.province, 'vars');
    sh.sed('-i', 'San Francisco', config.certification.city, 'vars');
    sh.sed('-i', 'Copyleft Certificate Co', config.certification.org, 'vars');
    sh.sed('-i', 'me@example.net', config.certification.email, 'vars');
    sh.sed('-i', 'My Organizational Unit', config.certification.ou, 'vars');
  }

  async initPki(config) {
    return new Promise((resolt, reject) => {
      let dir = this.path + config.code;
      sh.cd(dir);
      sh.exec('./easyrsa init-pki', {
        silent: true,
      });
      let consoleOne = sh.exec(
        './easyrsa build-ca nopass',
        {
          silent: true,
          async: true,
        },
        (code, stdout, stderr) => {
          resolt(code);
        }
      );
      consoleOne.stderr.on('data', (data) => {
        data.split('\n').forEach((e) => {
          if (e.startsWith('Common Name (eg:')) consoleOne.stdin.write('\n');
        });
      });
    });
  }

  async genServCerts(config) {
    return new Promise((resolt, reject) => {
      let dir = this.path + config.code;
      sh.cd(dir);
      let consoleOne = sh.exec(
        `./easyrsa gen-req ${config.code} nopass`,
        {
          silent: true,
          async: true,
        },
        (code, stdout, stderr) => {
          let consoleTwo = sh.exec(
            `./easyrsa sign-req server ${config.code}`,
            {
              silent: true,
              async: true,
            },
            (codeTwo, stdoutTwo, stderrTwo) => {
              log.log('Создание DH');
              sh.exec('./easyrsa gen-dh', { silent: true });
              log.log('Создание TA');
              sh.exec(`openvpn --genkey --secret ${dir}/pki/ta.key`, {
                silent: true,
              });
              log.log('Создание CRL');
              sh.exec('./easyrsa gen-crl', { silent: true });
              resolt(codeTwo);
            }
          );
          consoleTwo.stdout.on('data', (data) => {
            data.split('\n').forEach((e) => {
              if (e.includes('Confirm request details'))
                consoleTwo.stdin.write('yes\n');
            });
          });
        }
      );
      consoleOne.stderr.on('data', (data) => {
        data.split('\n').forEach((e) => {
          if (e.startsWith('Common Name (eg:')) consoleOne.stdin.write('\n');
        });
      });
    });
  }

  async cpServCerts(config) {
    let dir = `${this.path}${config.code}/pki`;
    let odir = `/etc/openvpn/${config.code}`;
    sh.cd(dir);
    if (fs.existsSync(odir)) {
      log.log('OpenVPN сервер существует! Очистка.');
      sh.exec(`rm -rf ${odir}`);
    }
    fs.mkdirSync(odir);
    odir += '/';
    sh.cp(`${dir}/ca.crt`, odir);
    sh.cp(`${dir}/issued/${config.code}.crt`, odir);
    sh.cp(`${dir}/private/${config.code}.key`, odir);
    sh.cp(`${dir}/ta.key`, odir);
    sh.cp(`${dir}/dh.pem`, odir);
    sh.cp(`${dir}/crl.pem`, odir);
  }

  async genServConf(config) {
    //let dir = this._path+conf.code+'/pki'
    sh.cd(this.dir);
    let sConf = fs.readFileSync('./scripts/server.conf').toString();

    let lcl = '#';
    if (config.network.host != '0.0.0.0') lcl = `local ${config.network.host}`;
    sConf = sConf.replace('#LOCAL', lcl);

    sConf = sConf.replace('#PORT', config.network.port);
    sConf = sConf.replace('#MANAGEMENT_PORT', config.network.mport);
    sConf = sConf.replace('#MAX_CLIENTS', config.maxclients);
    sConf = sConf.replace('#PROTO', config.network.proto);
    sConf = sConf.replace('#DEV', config.network.dev);
    sConf = sConf.replace('#CA_CRT', `${config.code}/ca.crt`);
    sConf = sConf.replace('#SERVER_CRL', `${config.code}/crl.pem`);
    sConf = sConf.replace('#SERVER_CRT', `${config.code}/${config.code}.crt`);
    sConf = sConf.replace('#SERVER_KEY', `${config.code}/${config.code}.key`);
    sConf = sConf.replace('#DH_PEM', `${config.code}/dh.pem`);

    let internet = ip.cidrSubnet(config.network.internet);
    sConf = sConf.replace(
      '#INTRANET',
      `server ${internet.networkAddress} ${internet.subnetMask}`
    );

    /*let gw = "";
    if (config.type == "device")
      gw =
        'push "redirect-gateway def1 bypass-dhcp"\npush "dhcp-option DNS 8.8.8.8"\npush "dhcp-option DNS 8.8.4.4"';
    sConf = sConf.replace("#GW", gw);*/

    if (config.friends) sConf = sConf.replace('#FRIENDS', 'client-to-client');
    sConf = sConf.replace('#TA_KEY', `${config.code}/ta.key`);

    let log = `status /var/log/openvpn/${config.code}-status.log`;
    if (config.logs) log += `\nlog-append /var/log/openvpn/${config.code}.log`;
    sConf = sConf.replace('#LOG', log);
    sConf = sConf.replace('#SERVER', config.code);

    fs.writeFileSync(`/etc/openvpn/${config.code}.conf`, sConf);
  }

  async genServClient(config) {
    let dir = `${this.path}${config.code}_client`;
    if (fs.existsSync(dir)) {
      log.log('удаление клиентского деректории!');
      sh.exec(`rm -rf ${dir}`);
    }
    log.log('Создание клиентских деректорий', dir);
    fs.mkdirSync(dir);
    let cliFilesDir = `${dir}/files`;
    fs.mkdirSync(cliFilesDir);

    sh.cd(this.dir);
    let cliConf = fs.readFileSync('./scripts/client.conf').toString();
    cliConf = cliConf.replace('#PROTO', config.network.proto);
    cliConf = cliConf.replace('#PORT', config.network.port);
    cliConf = cliConf.replace('#REMOTE', config.network.remote);
    let gw = '';
    if (config.network.type == 'public') gw = 'resolv-retry infinite';
    cliConf = cliConf.replace('#GW', gw);
    log.log('записываю client base.conf', `${dir}/base.conf`);
    fs.writeFileSync(`${dir}/base.conf`, cliConf);

    let caDir = `${this.path}${config.code}/pki`;
    let cliSh = fs.readFileSync('./scripts/client.sh').toString();
    cliSh = cliSh.replace('#KEY_DIR', `KEY_DIR=${caDir}`);
    cliSh = cliSh.replace('#OUTPUT_DIR', `OUTPUT_DIR=${cliFilesDir}`);
    cliSh = cliSh.replace('#BASE_CONFIG', `BASE_CONFIG=${dir}/base.conf`);
    log.log('Записываю client sh', `${dir}/cli.sh`);
    fs.writeFileSync(`${dir}/client.sh`, cliSh);
    sh.chmod('+x', `${dir}/client.sh`);

    log.success('Клиентские директории/скрипты созданны');
  }
}

module.exports = OpenVPN;
