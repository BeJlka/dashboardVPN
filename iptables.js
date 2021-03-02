const EventEmitter = require('events');
const fs = require('fs');

let log = require('./log');
let sh = require('shelljs');
let ip = require('ip');

class Iptables extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.ip = null;
    this.dev = null;
  }

  ipdev(data) {
    return new Promise((resolt) => {
      sh.exec(
        'ip -4 -o address',
        {
          silent: true,
          async: true,
        },
        (code, out, err) => {
          let lines = out.split('\n');
          let dev = '';
          for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (!line.includes(data)) continue;
            let rx = /^\d{1,2}:\s+([a-z0-9]+)\s.*$/;
            dev = rx.exec(line)[i];
            break;
          }
          resolt(dev);
        }
      );
    });
  }

  saveConfig(service, data) {
    if (service === 'iptables') {
      sh.cd(`/etc/${service}`);
      log.log('сохранение iptables');
      fs.writeFileSync(`/etc/${service}/rules.v4`, data);
      return {
        message: `Необходимо перезапустить службу ${service}, чтобы изменения вступили в силу.`,
      };
    }
  }

  async install() {
    log.log('IPTABLES', 'установка сетевого файрола');

    this.clear();
    let state = false;
    let read = fs.readFileSync(`/etc/sysctl.conf`).toString().split('\n');

    read.map((item) => {
      if (item.includes('net.ipv6.conf.all.disable_ipv6=1')) {
        state = true;
      }
    });

    if (!state) {
      log.log('IPTABLES', 'настраиваем ядро net.ipv4.ip_forward=1');
      read.push('net.ipv4.ip_forward=1');
      log.log('IPTABLES', 'отключаем ip6');
      read.push('net.ipv6.conf.all.disable_ipv6=1');
      read.push('net.ipv6.conf.default.disable_ipv6=1');
      read.push('net.ipv6.conf.lo.disable_ipv6=1');
    }
    fs.writeFileSync(`/etc/sysctl.conf`, read.join('\n'));

    log.success('IPTABLES', 'файрвол готов к системной установке');
    return null;
  }

  async start() {
    return null;
  }

  net(config) {
    //console.log(config.network.internet);
    return {
      ip: ip.cidrSubnet(config.network.internet).firstAddress,
      net: config.network.internet,
      dev: config.network.dev,
    };
  }

  async addRules(service) {
    log.log('IPTABLES', 'дополняем правила');
    if (service.type === 'root') {
      sh.exec(
        `iptables -A INPUT -s ${this.net(service).net} -p ${
          service.network.proto
        } --dport ${service.network.port} -j ACCEPT`
      );
    } else {
      sh.exec(
        `iptables -A INPUT -s ${this.net(service).net} -d ${
          this.net(service).ip
        } -p ${service.network.proto} --dport ${service.network.port} -j ACCEPT`
      );
    }

    sh.exec('iptables-save > /etc/iptables/rules.v4');
    sh.exec('systemctl restart iptables');
    log.success('правила дополнены');
  }

  async dropRules(service) {
    log.log('IPTABLES', 'удаляем правила');
    // if (service.type === 'root') {
    //   sh.exec(
    //     `iptables -D INPUT -s ${this.net(service).net} -p ${
    //       service.network.proto
    //     } --dport ${service.network.port} -j ACCEPT`
    //   );
    // } else {
    //   sh.exec(
    //     `iptables -D INPUT -s ${this.net(service).net} -d ${
    //       this.net(service).ip
    //     } -p ${service.network.proto} --dport ${service.network.port} -j ACCEPT`
    //   );
    // }
    sh.exec(
      `iptables -D INPUT -p ${service.network.proto} --dport ${service.network.port} -j ACCEPT`
    );
    if (service.type === "root")
      sh.exec(`iptables -D INPUT -s ${this.net(service).net} -j ACCEPT`);
    else { 
      sh.exec(
        `iptables -D INPUT -s ${this.net(service).net} -d ${
          this.net(service).ip
        } -j ACCEPT`
      );
    }

    sh.exec('iptables-save > /etc/iptables/rules.v4');
    sh.exec('systemctl restart iptables');
    log.success('правила удалены');
  }

  async installRules() {
    log.log('IPTABLES', 'устанавливаем правила');
    sh.exec('iptables -A INPUT -i lo -j ACCEPT');
    sh.exec(
      'iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT'
    );
    /*for (const server in this.config.servers) {
      let service = this.config.servers[server];
      sh.exec(
        `iptables -A INPUT -p ${service.network.proto} --dport ${service.network.port} -j ACCEPT`
      );
      if (service.type === "root")
        sh.exec(`iptables -A INPUT -s ${this.net(service).net} -j ACCEPT`);
      else {
        sh.exec(
          `iptables -A INPUT -s ${this.net(service).net} -d ${this.net(service).ip
          } -j ACCEPT`
        );
      }
      // if (service.type === 'root') {
      //   sh.exec(
      //     `iptables -A INPUT -s ${this.net(service).net} -p ${
      //       service.network.proto
      //     } --dport ${service.network.port} -j ACCEPT`
      //   );
      // } else {
      //   sh.exec(
      //     `iptables -A INPUT -s ${this.net(service).net} -d ${
      //       this.net(service).ip
      //     } -p ${service.network.proto} --dport ${
      //       service.network.port
      //     } -j ACCEPT`
      //   );
      // }
    }*/

    sh.exec('iptables-save > /etc/iptables/rules.v4');
    sh.exec('systemctl enable iptables');
    sh.exec('systemctl restart iptables');

    log.log('правила установлены');
  }

  unDropAllTraffic() {
    sh.exec('iptables -D INPUT -j DROP');
    sh.exec('iptables-save > /etc/iptables/rules.v4');
  }

  dropAllTraffic() {
    sh.exec('iptables -A INPUT -j DROP');
    sh.exec('iptables-save > /etc/iptables/rules.v4');
  }

  clear() {
    log.log('сброс файрвола');
    sh.exec('iptables -P INPUT ACCEPT');
    sh.exec('iptables -P FORWARD ACCEPT');
    sh.exec('iptables -P OUTPUT ACCEPT');
    //sh.exec("iptables -t nat -F");
    sh.exec('iptables -t mangle -F');
    //sh.exec("iptables -t nat -X");
    sh.exec('iptables -t mangle -X');
    sh.exec('iptables -F');
    sh.exec('iptables -X');
    sh.exec('iptables -Z');
    sh.exec('iptables-save > /etc/iptables/rules.v4');
    log.success('файрвол очищен');
    return null;
  }
}

module.exports = Iptables;
