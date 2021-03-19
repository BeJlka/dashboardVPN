#!/bin/bash

echo "Начало установки"

OVPN_DIR=/opt/server-dashboard
OVPN_GIT=https://github.com/BeJlka/dashboardVPN.git
MQTT_DIR=/opt/client-dashboard
#MQTT_GIT=https://github.com/picalex/web.mqtt.dashboard.git
MQTT_GIT=https://github.com/Picalex/project1

apt-get update
apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
apt-get install -y iptables-persistent openvpn git nodejs

wget -P /opt/ https://github.com/OpenVPN/easy-rsa/releases/download/v3.0.6/EasyRSA-unix-v3.0.6.tgz
cd /opt/ && tar xvf EasyRSA-unix-v3.0.6.tgz
mkdir /usr/share/easy-rsa
cp -r /opt/EasyRSA-v3.0.6/* /usr/share/easy-rsa/
cd /opt/ && rm -rf EasyRSA-unix-v3.0.6.tgz && rm -rf EasyRSA-v3.0.6

systemctl stop ufw
systemctl disable ufw

mkdir -p /var/log/openvpn

ln -s `which node` /usr/sbin/

mkdir $OVPN_DIR
mkdir $MQTT_DIR

#npm i -g forever forever-service 
npm i -g --unsefe-perm node-red

touch /etc/systemd/system/node-red.service
touch /etc/systemd/system/server-dashboard.service
touch /etc/systemd/system/client-dashboard.service

#echo -e "[Unit]\nDescription=Node-RED\nAfter=syslog.target network.target\n[Service]\nExecStart=/usr/local/bin/node-red\nRestart=on-failure\nKillSignal=SIGINT\n# log output to syslog as 'node-red'\nSyslogIdentifier=node-red\nStandardOutput=syslog\n# root user to run as\nUser=root\nGroup=root\n[Install]\nWantedBy=multi-user.target" >> /home/node-red.service
#root

echo -e "[Unit]\nDescription=Node-RED\nAfter=syslog.target network.target\n[Service]\nExecStart=/usr/bin/node-red\nRestart=on-failure\nKillSignal=SIGINT\n# log output to syslog as 'node-red'\nSyslogIdentifier=node-red\nStandardOutput=syslog\n# root user to run as\nUser=root\nGroup=root\n[Install]\nWantedBy=multi-user.target" >> /etc/systemd/system/node-red.service

systemctl daemon-reload
systemctl start node-red
systemctl enable node-red

echo -e "[Unit]\nDescription=server-dashboard\nAfter=syslog.target network.target\n[Service]\nWorkingDirectory=/opt/server-dashboard\nExecStart=npm run dev --daemon\nRestart=on-failure\nKillSignal=SIGINT\n# log output to syslog as 'server-dashboard'\nSyslogIdentifier=server-dashboard\nStandardOutput=syslog\n# root user to run as\nUser=root\nGroup=root\n[Install]\nWantedBy=multi-user.target" >> /etc/systemd/system/server-dashboard.service
echo -e "[Unit]\nDescription=client-dashboard\nAfter=syslog.target network.target\n[Service]\nWorkingDirectory=/opt/client-dashboard\nExecStart=npm run dev --daemon\nRestart=on-failure\nKillSignal=SIGINT\n# log output to syslog as 'client-dashboard'\nSyslogIdentifier=client-dashboard\nStandardOutput=syslog\n# root user to run as\nUser=root\nGroup=root\n[Install]\nWantedBy=multi-user.target" >> /etc/systemd/system/client-dashboard.service

if grep -q "uiHost: \"10.1.0.1\"" /root/.node-red/settings.js;
  then
    echo "Правила уже установленны"
  else
    #sed -i '/uiHost: \"127.0.0.1\",/a \    uiHost: \"10.1.0.1\",' /usr/local/lib/node_modules/node-red/settings.js
    sed -i '/uiHost: \"127.0.0.1\",/a \    uiHost: \"10.1.0.1\",' /root/.node-red/settings.js #root
fi

git clone $OVPN_GIT $OVPN_DIR
git clone --branch=product $MQTT_GIT $MQTT_DIR

cd $OVPN_DIR/client && sudo npm i
cd $OVPN_DIR && npm i

cd $MQTT_DIR/client && npm i
cd $MQTT_DIR/client && sudo npm i
cd $MQTT_DIR && npm i

wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list

apt-get update
apt-get install -y mongodb-org

systemctl start mongod

echo "Необходимо ввести параметры для создания пользователя в MongoDB";
read -p "Название db: " dataBase
read -p "Имя Админа: " user
read -sp "Пароль: " password

echo

mongo << EOF 
use $dataBase
db.createUser({user: "$user",pwd: "$password",roles: [ { role: "userAdminAnyDatabase", db: "$dataBase" } ]})
quit()
EOF

echo -e "{\"user\": \"$user\", \"password\": \"$password\", \"dataBase\": \"$dataBase\"}" > /opt/mongod.conf

if grep -q "authorization: enabled" /etc/mongod.conf;
  then
    echo "Правила уже установленны"
  else
    sed -i '/#security:/a \security:\n  authorization: enabled' /etc/mongod.conf 
fi

systemctl restart mongod

echo "Пользователь создан"

wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -cs`-pgdg main" |sudo tee /etc/apt/sources.list.d/pgdg.list

apt-get update
apt-get install postgresql-13 -y

echo "Необходимо ввести параметры для создания пользователя в PostgreSQL";
read -p "Название db: " dataBasePG
read -p "Имя пользователя Ubuntu: " userPG
read -sp "Пароль: " passwordPG

echo

# alter user postgres with password '1234';
#psql -U<USERNAME> -h<HOSTNAME> -d<DB_NAME>;
sudo -u postgres psql<< EOF 
create user $userPG with password '$passwordPG';
create database $dataBasePG;
grant all privileges on database $dataBasePG to $userPG;
CREATE ROLE "ReadAndWrite" NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT "ReadAndWrite" TO $userPG;
\c $dataBasePG;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO GROUP "ReadAndWrite";
\q
EOF

echo -e "{\"user\": \"$userPG\", \"password\": \"$passwordPG\", \"dataBase\": \"$dataBasePG\"}" > /opt/pg.conf

apt-get install -y mosquitto

systemctl daemon-reload

systemctl stop node-red
systemctl start node-red
systemctl enable node-red
systemctl enable mongod
systemctl start openvpn
systemctl enable openvpn
systemctl start iptables
systemctl enable iptables
systemctl start mosquitto
systemctl enable mosquitto

systemctl start client-dashboard
systemctl start server-dashboard
systemctl enable client-dashboard
systemctl enable server-dashboard

echo "Установка завершена."
