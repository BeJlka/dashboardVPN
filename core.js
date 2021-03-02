const EventEmitter = require('events');
const config = require('./config');
const fs = require('fs');
const OpenVPN = require('./open');
const Iptables = require('./iptables');
const Mosquitto = require('./mosquitto');

let express = require('express');
let log = require('./log');
let sh = require('shelljs');
let ip = require('ip');

class Core extends EventEmitter {
  constructor() {
    super();
    this.dir = sh.pwd();
    this.ip = '';
    this.status = 'none';
    this.installing = false;
    this.server = {};
    this.reserved = {};

    this.openvpn = new OpenVPN();
    this.iptables = new Iptables(config);
    this.mosquitto = new Mosquitto(config);

    this.loadReserve();
    this.loadServer();
    this.loadIp();

    this.app = express();
    this.app.use(express.json({ extended: true }));
    this.httpRoutes();
  }

  httpRoutes() {
    //
    // Запрос конфига iptables
    //
    this.app.get('/api/config/:service', async (req, res) => {
      let service = req.params.service;
      if (service === 'iptables') {
        sh.cd(`/etc/${service}`);
        return res.json(
          await fs.readFileSync(`/etc/${service}/rules.v4`).toString()
        );
      }
    });

    //
    // Сохраненеи конфига iptables
    //
    this.app.post('/api/saveconfig', async (req, res) => {
      let service = req.body.service;
      let data = req.body.data;
      res.json(await this.iptables.saveConfig(service, data));
    });

    //
    // Создание сервера OpenVPN
    //
    this.app.post('/api/createovpn', async (req, res) => {
      let configServer = req.body.config;
      let name = req.body.name;
      res.json(await this.createVPN(configServer, name));
    });

    //
    // Для тестов
    //
    this.app.get('/api/test', async (req, res) => {});

    //
    // Переустановка сервера
    //
    this.app.get('/api/reinstall', async (req, res) => {
      log.log('Очистка');
      await this.clear();
      this.server = {};
      this.ip = sh
        .exec('wget -qO- eth0.me', { silent: true })
        .stdout.split('\n')[0];
      //this.ip = '192.168.1.60';
      //this.ip = '192.168.1.51';
      this.dev = this.iptables.ipdev(this.ip);

      this.createJSONFiles();
      await this.saveIp();
      await this.loadIp();

      await this.iptables.install();
      await this.iptables.installRules();
      this.iptables.unDropAllTraffic();
      for (let key in config.servers) {
        await this.install(config.servers[key], key);
      }
      log.success('Сервер готов к работе');
      res.json({ success: true });
    });

    //
    // Проверка имени нового сервера  OpenVPN
    //
    this.app.post('/api/checkovpn', async (req, res) => {
      let nameServer = req.body.name;
      await this.checkOVPN(nameServer, res);
    });

    //
    // Запрос списка сервисов и серверов
    //
    this.app.post('/api/service', (req, res) => {
      res.json(this.service(req.body.data));
    });

    //
    // Запуск сервиров и сервисов
    //
    this.app.post('/api/service/start', (req, res) => {
      let UNIT = req.body.UNIT;
      let service = req.body.service;
      if (UNIT.includes('openvpn@')) {
        this.openvpn.startServer(UNIT.split('@')[1]);
      } else {
        log.log(`запускаем <${UNIT}>`);
        sh.exec(`systemctl start ${UNIT}`);
        if (UNIT === 'iptables') this.iptables.dropAllTraffic();
      }
      res.json(this.service(service));
    });

    //
    // Остановка серверов и сервисов
    //
    this.app.post('/api/service/stop', (req, res) => {
      let UNIT = req.body.UNIT;
      let service = req.body.service;
      if (UNIT.includes('openvpn@')) {
        this.openvpn.stopServer(UNIT.split('@')[1]);
      } else {
        log.log(`останавливаем <${UNIT}>`);
        sh.exec(`systemctl stop ${UNIT}`);
        if (UNIT === 'iptables') this.iptables.unDropAllTraffic();
      }
      res.json(this.service(service));
    });

    //
    // Перезапуск северов и сервисов
    //
    this.app.post('/api/service/restart', (req, res) => {
      let UNIT = req.body.UNIT;
      let service = req.body.service;
      if (UNIT.includes('openvpn@')) {
        this.openvpn.restartServer(UNIT.split('@')[1]);
      } else {
        log.log(`перезапуск <${UNIT}>`);
        sh.exec(`systemctl restart ${UNIT}`);
      }
      res.json(this.service(service));
    });

    //
    // Создание клиентов
    //
    this.app.post('/api/service/create', async (req, res) => {
      let code = req.body.code;
      let server = req.body.server;
      let password = req.body.password;
      res.json(await this.create(code, server, password));
    });

    //
    // Запрос списка клиентов
    //
    this.app.get('/api/list/:server', (req, res) => {
      let data = req.params.server;
      res.json(this.mosquitto.clientList(data, this.server));
    });

    //
    // Удаление клиентов и серверов
    //
    this.app.post('/api/delete', async (req, res) => {
      let service = req.body.service;
      let data = req.body.data;
      return res.json(await this.delete(service, data));
    });

    //
    // Блокировка и разблокировка сертификата OpenVPN
    //
    this.app.post('/api/blocked', async (req, res) => {
      let data = req.body.data;
      let json = this.openvpn.blocked(data, this.server);
      this.saveServer();
      return res.json(json);
    });

    //
    // Добавление и удаленеи из автозагрузки
    //
    this.app.post('/api/enabled', async (req, res) => {
      let UNIT = req.body.UNIT;
      let ENABLED = req.body.ENABLED;
      let service = req.body.service;
      console.log(`${UNIT}, ${ENABLED}, ${service}`);
      return res.json(this.service(service));
    });

    //
    // Загрузка сертификата OpenVPN
    //
    this.app.post('/api/ovpn', async (req, res) => {
      let clientCode = req.body.clientCode;
      let serverCode = req.body.serverCode;
      if (!this.serverExists(serverCode)) {
        return res.json({ err: 'Not found' });
      }
      let check = this.server[serverCode].clientList.filter((item) => {
        if (item.code === clientCode) return true;
      });
      if (!check) {
        return res.json({ err: 'Not found' });
      }
      sh.cd(config.dir);
      let active = sh
        .exec('systemctl is-active iptables', { silent: true })
        .stdout.split('\n')[0];
      if (
        this.server.admin.clientList.length == 1 &&
        serverCode === 'admin' &&
        !active
      ) {
        await this.iptables.installRules();

        this.iptables.dropAllTraffic();
      }
      res.download(
        `${serverCode}_client/files/${clientCode}.ovpn`,
        `${clientCode}@${serverCode}.ovpn`
      );
    });
  }

  async start() {
    log.test(`Запускаем систему. Порт ${config.PORT}`);
    this.app.listen(config.PORT);

    if (
      !sh.test('-f', `${config.dir}/servers.json`) ||
      !sh.test('-f', `${config.dir}/ip.json`) ||
      !sh.test('-f', `${config.dir}/reserved.json`)
    ) {
      this.status = 'install';
      log.log('установка');
      await this.clear();
      this.server = {};
      this.ip = sh
        .exec('wget -qO- eth0.me', { silent: true })
        .stdout.split('\n')[0];
      //this.ip = '192.168.1.60';
      //this.ip = '192.168.1.51';
      //this.ip = "192.168.31.72";
      this.dev = this.iptables.ipdev(this.ip);

      this.createJSONFiles();
      await this.saveIp();
      await this.loadIp();

      await this.iptables.install();
      await this.iptables.installRules();
      this.iptables.unDropAllTraffic();
      for (let key in config.servers) {
        await this.install(config.servers[key], key);
      }

      log.success('Сервер готов к работе');
    }
  }

  async create(code, server, password) {
    if (code === 'undefined') {
      return { success: false, message: 'Введите имя' };
    }

    if (server.includes('&')) {
      log.log(`[${server},${code}]`);
      let state = false;
      this.reserved.mosquitto.name.map((item) => {
        if (item == code) state = true;
      });
      this.server.client.clientList.map((item) => {
        console.log(item);
        if (item.code == code) state = true;
      });
      if (state) {
        return {
          success: false,
          message: 'Данное имя занято. Попробуйте другое.',
        };
      }
      let data = await this.genClient(server.split('&')[0], code);

      console.log(password);
      if (password == undefined) {
        return { success: false, message: 'Введите пароль' };
      }
      let dataMosq = await this.createClientMosquitto(
        code,
        server.split('&')[1],
        password
      );

      if (data.success && dataMosq.success) {
        return { success: true };
      } else if (!data.success && !dataMosq.success) {
        log.log('удаление');
        await this.delete(`openvpn@${server.split('&')[0]}`, {
          code: code,
          server: server.split('&')[0],
        });
        await this.delete(`${server.split('&')[1]}`, code);
        log.log('удалено');
      } else if (!data.success && dataMosq.success) {
        log.log('удаление клиента москитто');
        await this.delete(`${server.split('&')[1]}`, code);
        log.log('удален');
      } else if (data.success && !dataMosq.success) {
        log.log('удаление клиента openvpn');
        await this.delete(`openvpn@${server.split('&')[0]}`, {
          code: code,
          server: server.split('&')[0],
        });
        log.log('удален');
      }
      return {
        success: false,
        message: 'Не удалось создать пользователя. Попробуйте еще раз.',
      };
    } else {
      if (server !== 'mosquitto') {
        log.log(`[${server}, ${code}]`);

        let data = await this.genClient(server, code);
        return data;
      }

      let data = await this.createClientMosquitto(code, server, password);
      return data;
    }
  }

  async createClientMosquitto(code, server, password) {
    let res = this.mosquitto.create(code, server, password, this.reserved);
    if (res.success) this.saveReserve();
    return res;
  }

  async delete(service, data) {
    if (service === 'openvpn') {
      this.iptables.dropRules(this.server[data]);
      let res = this.openvpn.destroyServer(
        data,
        service,
        this.reserved,
        this.server
      );
      this.saveServer();
      this.saveReserve();
      return res;
    } else if (service === 'mosquitto') {
      let res = this.mosquitto.delete(data, this.reserved);
      if (res.success) this.saveReserve();
      return res;
    } else if (service.includes('@')) {
      log.log('удаление клиента');
      let array = [];
      this.server[data.server].clientList.map((item, index) => {
        if (item.code !== data.code) {
          array.push(item);
        }
      });
      this.server[data.server].clientList = array;
      this.saveServer();
      await this.openvpn.revokeClient(data.server, data.code);
      log.log(`удаление файла ${data.code}.ovpn`);
      sh.exec(`rm -rf ${data.server}_client/files/${data.code}.ovpn`);

      log.success('клиент удален');
      if (this.server.admin.clientList.length === 0) {
        this.iptables.unDropAllTraffic();
      }

      return { success: true, data: this.server[data.server].clientList };
    }
  }

  async clear() {
    sh.exec(`rm -rf ${config.dir}/ip.json`);
    log.log('ip.json', 'удален');
    sh.exec(`rm -rf ${config.dir}/server.json`);
    log.log('server.json', 'удален');
    sh.exec(`rm -rf ${config.dir}/reserved.json`);
    log.log('reserved.json', 'удален');

    sh.exec('iptables -D INPUT -i lo -j ACCEPT');
    sh.exec(
      'iptables -D INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT'
    );

    for (const key in this.server) {
      let serv = this.server[key];
      this.iptables.dropRules(serv);

      sh.exec(`systemctl disable openvpn@${key}`);
      sh.exec(`systemctl stop openvpn@${key}`);
      sh.exec(`pkill openvpn@${key}`);
      sh.exec(`rm -rf /etc/openvpn/${key}.conf`);
      log.log(`файл сервера <${key}> удален`);
    }

    sh.exec(`rm -rf ${config.dir}/*`);
    log.log(config.dir, 'директория очищена');
    sh.exec('rm -rf /etc/openvpn/*');
    log.log('etc/openvpn', 'директория очищена');
    this.mosquitto.clear();
  }

  async createVPN(configServer, nameServer) {
    log.test('создание vpn сервера');
    let state = false;

    this.reserved.openvpn.name.map((item) => {
      if (item === nameServer) state = true;
    });
    if (state) {
      log.log('имя занято');
      return {
        success: false,
        message: 'Данное имя занято. Попробуйте еще раз',
      };
    }
    this.reserved.openvpn.ip.map((item) => {
      if (item === configServer[nameServer].network.internet) {
        state = true;
      }
    });
    if (state) {
      log.log('настройки сети заняты');
      return {
        success: false,
        message: 'Настройки сети уже заняты. Попробуйте еще раз.',
      };
    }
    await this.install(configServer[nameServer], nameServer);

    log.success('сервер создан');
    return { success: true, message: 'Сервер создан' };
  }

  serverExists(data) {
    return !(typeof this.server[data] == 'undefined');
  }

  async checkOVPN(nameServer, res) {
    let reserved = this.reserved.openvpn;
    let state = false;
    reserved.name.map((item) => {
      if (item === nameServer) state = true;
    });
    if (state) {
      return res.json({
        success: false,
        message: 'Данное имя занято. Введите другое',
      });
    }
    let readTemplate = JSON.parse(
      fs.readFileSync(`${__dirname}/template/serviceovpn.json`).toString()
    );
    let conf = {
      [nameServer]: readTemplate.template,
    };
    conf[nameServer].code = nameServer;

    let ip;
    let dev;
    let port;
    let mport;

    for (let i = 1; i < 254; i++) {
      let counter = 0;
      reserved.ip.map((item) => {
        let str = `10.${i}.0.0/24`;
        if (str !== item) {
          counter++;
        }
        if (counter === reserved.ip.length) {
          ip = str;
          dev = `tun${i - 1}`;
          port = 1194 + i - 1;
          mport = port + 1000;
          i = 256;
        }
      });
    }
    conf[nameServer].network.internet = ip;
    conf[nameServer].network.dev = dev;
    conf[nameServer].network.port = port;
    conf[nameServer].network.mport = mport;

    return res.json({ success: true, config: conf });
  }

  async lockClient(clientCode, serverCode) {
    if (!this.serverExists(serverCode)) {
      return { success: false, err: 'SERVER_NOT_EXISTS' };
    }
    let check = false;
    this.server[serverCode].clientList.map((item) => {
      if (item.code === clientCode) {
        check = true;
      }
    });
    if (!check) {
      return { success: false, err: 'KEY_NOT_EXISTS' };
    }
    log.log(this.server[serverCode]);
    await this.openvpn.revokeClient(serverCode, clientCode);

    for (let i = 0; i < this.server[serverCode].clientList.length; i++) {
      if (this.server[serverCode].clientList[i].code === clientCode) {
        this.server[serverCode].clientList[i].blocked = true;
        break;
      }
    }
    this.saveServer();
    return { success: true };
  }

  createJSONFiles() {
    log.log('Проверка на существование конфигурационных файлов');
    if (!sh.test('-f', `${config.dir}/servers.json`)) {
      sh.cd(config.dir);
      sh.exec(`touch servers.json`);
      log.log('servers.json создан');
    }
    if (!sh.test('-f', `${config.dir}/ip.json`)) {
      sh.cd(config.dir);
      sh.exec(`touch ip.json`);
      log.log('ip.json создан');
    }
    if (!sh.test('-f', `${config.dir}/reserved.json`)) {
      sh.cd(config.dir);
      sh.exec(`touch reserved.json`);
      this.reserved = {
        openvpn: {
          ip: [],
          dev: [],
          port: [],
          name: ['clientList', 'service', 'server'],
          mport: [],
        },
        mosquitto: {
          name: [],
        },
      };
      this.saveReserve();
      log.log('reserved.json создан');
    }
  }

  async install(server, serverName) {
    log.log(`устанавливаем vpn сервер <${serverName}>`);
    if (!server.certification) server.certification = config.certification;
    server.network.remote = this.ip;

    this.reserved.openvpn.ip.push(server.network.internet);
    this.reserved.openvpn.dev.push(
      parseInt(server.network.dev.split('tun')[1])
    );
    this.reserved.openvpn.port.push(server.network.port);
    this.reserved.openvpn.name.push(serverName);
    this.reserved.openvpn.mport.push(server.network.mport);

    await this.saveReserve();
    await this.createServer(server);
    await this.iptables.addRules(server);
    await this.openvpn.startServer(server.code);
    log.success('vpn сервер установлен');
  }

  async genClient(server, data) {
    let check = false;
    this.server[server].clientList.map((item) => {
      if (item.code === data) check = true;
    });
    if (check) return { success: false, message: 'Клиен существует' };
    let resolt = await this.openvpn.genCli(data, server);
    if (resolt) return null;
    let createClient = {
      code: data,
      blocked: false,
      server: server,
    };
    this.server[server].clientList.push(createClient);
    this.saveServer();
    return { success: true };
  }

  async createServer(data) {
    let err = await this.openvpn.createServer(data);
    if (err) {
      log.error(`Не удалось создать сервер <${data.code}>`);
      return err;
    }
    data.internet = ip.cidrSubnet(data.network.internet);
    data.clientList = [];
    this.server[data.code] = data;
    this.saveServer();
  }

  saveServer() {
    log.log('Сохранение сервера');
    sh.cd(this.dir);
    fs.writeFileSync(`${config.dir}/servers.json`, JSON.stringify(this.server));
    log.success('Сервер сохранен');
  }

  loadServer() {
    log.log('Загрузка сервера и клиентов');
    sh.cd(this.dir);
    this.server = {};
    if (sh.test('-f', `${config.dir}/servers.json`)) {
      let state = fs.statSync(`${config.dir}/servers.json`);
      if (state.size != 0) {
        this.server = JSON.parse(fs.readFileSync(`${config.dir}/servers.json`));
        log.success('Загружено');
      } else {
        log.log('файл пустой');
      }
    }
  }

  async loadIp() {
    log.log('загружаем ip');
    sh.cd(this.dir);
    let load = null;

    if (sh.test('-f', `${config.dir}/ip.json`)) {
      let state = fs.statSync(`${config.dir}/ip.json`);
      if (state.size != 0) {
        load = fs.readFileSync(`${config.dir}/ip.json`);
        load = JSON.parse(load);
        log.success('загружено');
      } else {
        log.log('файл пустой');
      }
      this.openvpn.ip = null;
      this.openvpn.dev = null;
      if (load) {
        this.ip = load.ip;
        this.dev = load.dev;
      }
      this.openvpn.ip = this.ip;
      this.iptables.ip = this.ip;
      this.openvpn.dev = this.dev;
      this.iptables.dev = this.dev;
    }
  }

  async loadReserve() {
    log.log('Загрузка reserved');
    sh.cd(this.dir);

    if (sh.test('-f', `${config.dir}/reserved.json`)) {
      let state = fs.statSync(`${config.dir}/reserved.json`);
      if (state.size != 0) {
        this.reserved = await JSON.parse(
          fs.readFileSync(`${config.dir}/reserved.json`).toString()
        );
        log.success('загружено');
        return null;
      }
    }
    log.log('файл пустой');
  }

  async saveReserve() {
    log.log('сохраняем reserve');
    fs.writeFileSync(
      `${config.dir}/reserved.json`,
      JSON.stringify(this.reserved)
    );
    log.success('сохранено');
  }

  async saveIp() {
    log.log('сохраняем ip');
    sh.cd(this.dir);
    fs.writeFileSync(
      `${config.dir}/ip.json`,
      JSON.stringify({ ip: this.ip, dev: this.dev })
    );
    log.success('сохранено');
  }

  service(name) {
    let resObj = { openvpn: [], firewall: [], service: [] };
    sh.exec('systemctl list-units --type service -all', {
      silent: true,
    })
      .stdout.split('\n')
      .map((service) => {
        Object.keys(name).map((key) => {
          name[key].map((element) => {
            if (service.includes(element)) {
              service = service
                .split(' ')
                .filter((item) => item !== '' && item !== '●');
              resObj[key].push({ UNIT: service[0], SUB: service[3] });
            }
          });
        });
      });
    return resObj;
  }
}

module.exports = Core;
