# DashboardVPN

Этот проетк написан для ubuntu 20.04. Он представляет из себя web интерфейс для OpenVPN и MQTT со следующими возможносями:
* фильтрацию трафика с помощью iptables;
* установка с поощью установочного файла install.sh;
* удалять, добавлять новые сервисы OpenVPN;
* остановка, перезапуск, запуск сервисов;
* создание, удаление и блокировка клиентов для OpenVPN и MQTT. 

## Стак использованных технологий
**Front-end** написан с использованием **React** + **materialize-css**.

**Back-end** написан на **nodejs** с использованием **express** и **shelljs** (для выполнение команд в ubuntu)
