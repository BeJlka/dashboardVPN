import React, { useEffect, useState, useCallback } from "react";
import { DashboardTable } from "../components/DashboardTable";
import { useHttp } from "../hooks/http.hook";
import { useMessage } from "../hooks/message.hook";
import config from "../config.json";
import { Loader } from "../components/Loader";
import { Modal } from "../components/Modal";

export const DashboardPage = () => {
  const [service, setService] = useState({
    openvpn: [],
    firewall: [],
    service: [],
  });
  const [redirect, setRedirect] = useState(false);
  const { loading, request, error, clearError } = useHttp();
  const message = useMessage();

  const fetchData = useCallback(async () => {
    try {
      console.log("Запрос OpenVPN, IpTables, Service");
      const dataService = await request(`/api/service`, "POST", {
        data: config.response,
      });
      //const dataFirewall = await request("/api/service/ufw");
      //const dataService = await request("/api/service");
      setService(dataService);
    } catch (error) {}
  }, [request]);

  const serviceStart = async (UNIT) => {
    try {
      console.log("Старт", UNIT);
      message(`Сервер ${UNIT} запускается`);
      const data = await request(`/api/service/start`, "POST", {
        UNIT: UNIT,
        service: config.response,
      });
      // serviceReq.map((item) => {
      //   if (UNIT.includes(item)) {
      //     setService(data);
      //   }
      // });
      setService(data); 
      message(`Сервер ${UNIT} запущен`);
    } catch (error) {}
  };

  const serviceStop = async (UNIT) => {
    try {
      console.log("Стоп", UNIT);
      message(`Сервер ${UNIT}  останавливается`);
      const data = await request(`/api/service/stop`, "POST", {
        UNIT: UNIT,
        service: config.response,
      });
      // serviceReq.map((item) => {
      //   if (UNIT.includes(item)) {
      //     setService(data);
      //   }
      // });
      setService(data);
      message(`Сервер ${UNIT} остановлен`);
    } catch (error) {}
  };

  const serviceRestart = async (UNIT) => {
    try {
      console.log("Рестарт", UNIT);
      message(`Сервер ${UNIT} перезапускается`);
      const data = await request(`/api/service/restart`, "POST", {
        UNIT: UNIT,
        service: config.response,
      });
      // serviceReq.map((item) => {
      //   if (UNIT.includes(item)) {
      //     setService(data);
      //   }
      // });
      setService(data);
      message(`Сервер ${UNIT} перезапущен`);
    } catch (error) {}
  };

  const reinstall = async () => {
    let data = await request("/api/reinstall");
    if (data.success) {
      setRedirect(true);
    }
  };

  const enabled = useCallback(
    async (UNIT, ENABLED, service) => {
      try {
        const data = await request("/api/enabled", "POST", {
          UNIT: UNIT,
          ENABLED: ENABLED,
          service: service,
        });
      } catch (error) {}
    },
    [request]
  );

  const createButton = (service, name, text) => {
    let disable;
    if (service.SUB === "dead" && (name === "stop" || name === "restart")) {
      disable = "disabled";
    } else if (
      (service.SUB === "running" || service.SUB === "exited") &&
      name === "start"
    ) {
      disable = "disabled";
    } else if (name === "enabled") {
      console.log(service);
      if (service.ENABLED.includes("enabled")) {
        disable = "disabled";
      } else {
        disable = "disabled";
      }
    }

    let style;
    if (disable) {
      style = `btn waves-effect waves-light ${name}-${disable}`;
    } else {
      style = `btn waves-effect waves-light ${name}`;
    }

    const change = () => {
      if (name === "start") {
        return serviceStart(service.UNIT.split(".")[0]);
      } else if (name === "stop") {
        return serviceStop(service.UNIT.split(".")[0]);
      } else if (name === "restart") {
        return serviceRestart(service.UNIT.split(".")[0]);
      } else if (name === "enabled") {
        return enabled(service.UNIT.split(".")[0], service.ENABLED);
      }
    };

    return (
      <button
        className={style}
        name={name}
        onClick={() => {
          change();
        }}
      >
        {text}
      </button>
    );
  };

  useEffect(() => {
    message(error);
    clearError();
  }, [error, message, clearError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    var elems = document.querySelectorAll(".modal");
    window.M.Modal.init(elems, { dismissible: false });
  });

  if (redirect) {
    setRedirect(false);
    fetchData();
  }

  return (
    <>
      {loading && (
        <Loader
          loader={"loader-dashboadr"}
          text={"Пожалуйста подождите.\nИдет загрузка."}
        />
      )}
      {!loading && (
        <div>
          {service.firewall.length == 0 && <h3>Не удалось загрузить блок Firewall</h3>}
          {service.firewall.length !=0 && (
            <DashboardTable
              name="Firewall"
              service={service.firewall}
              createButton={createButton}
              data={"config"}
            />
          )}
          {service.openvpn.length == 0 && <h3>Не удалось загрузить блок OpenVPN</h3>}
          {service.openvpn.length != 0 && (
            <DashboardTable
              name="OpenVPN" 
              service={service.openvpn}
              createButton={createButton}
              data={"settings"}
            />
          )}
          {service.service.length == 0 && <h3>Не удалось загрузить блок Service</h3>}
          {service.service.length != 0 && (
            <DashboardTable
              name="Service"
              service={service.service}
              createButton={createButton}
            />
          )}
          <Modal
            nameButton="Переустановить"
            modalHeader="Внимание"
            modalBody="При переустановке все данные сервера будут удаленны. Вы уверены что
            хотите переустановить?"
            modalFuncion={reinstall}
          />
        </div>
      )}
    </>
  );
};
