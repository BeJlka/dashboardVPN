import React, { useEffect, useState, useCallback } from "react";
import { Redirect, useParams } from "react-router-dom";
import { useHttp } from "../hooks/http.hook";
import { useMessage } from "../hooks/message.hook";
import { ListService } from "../components/ListService";
import { Loader } from "../components/Loader";
import { Modal } from "../components/Modal";

export const SettingsPage = () => {
  const [list, setList] = useState();
  const [listLength, setListLength] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [config, setConfig] = useState([]);
  const [form, setForm] = useState();
  const message = useMessage();
  const { loading, request, error, clearError } = useHttp();
  const service = useParams().service.split(".")[0];

  const downloadConfig = useCallback(async () => {
    try {
      const data = await request(`/api/config/${service}`);
      setConfig(data);
    } catch (error) {}
  }, [request, service]);

  const saveConfig = useCallback(
    async (form) => {
      try {
        setConfig(form);
        console.log("save");
        const data = await request(`/api/saveconfig`, "POST", {
          service: service.split("@")[1].split(".")[0],
          server: service.split("@")[0],
          data: form,
        });
        message(data.message);
      } catch (error) {}
    },
    [request, service]
  );

  const downloadList = useCallback(async () => {
    try {
      const data = await request(`/api/list/${service}`);
      if (data.data !== "FILE_NOT_FOUND") {
        setList(data.data);
        if (data.data.length === 0) {
          setListLength(true);
        }
      } else {
        setListLength(true);
      }
    } catch (error) {}
  }, [request, service]);

  const downloadClientConfig = async (item) => {
    try {
      /*const data = await request(`/api/ovpn`, "POST", {
        serverCode: item.server,
        clientCode: item.code,
      });*/
      const response = await fetch("/api/ovpn", {
        method: "POST",
        body: JSON.stringify({
          serverCode: item.server,
          clientCode: item.code,
        }),
        headers: { ["Content-type"]: "application/json" },
      });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(new Blob([await response.blob()]));
      link.setAttribute("download", `${item.code}@${item.server}.ovpn`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      //setLocal(true);
      //alert("Перейдите по адресу http://10.1.0.1:3000");
    } catch (error) {}
  };
  const deleteClient = useCallback(
    async (item, service) => {
      try {
        const data = await request(`/api/delete`, "POST", {
          service: service,
          data: item,
        });
        if (service == "openvpn" && data.success) {
          setRedirect(true);
        }
        if (data.data.length != 0) {
          setList(data.data);
          setListLength(false);
        } else if (data.data.length == 0) {
          setListLength(true);
        }

        /*setList(data);
      if (data.length === 0) {
        setListLength(true);
      }*/
      } catch (error) {}
    },
    [request, service] 
  );

  const downloadButton = (item) => {
    let style = "btn waves-effect waves-light download";
    if (item.blocked) {
      style = style + "-disabled";
    }
    return (
      <button
        className={style}
        name="download"
        onClick={() => {
          downloadClientConfig(item);
        }}
      >
        <i className="material-icons">file_download</i>
      </button>
    );
  };

  const blocked = useCallback(async (item) => {
    try {
      item.blocked = !item.blocked;
      const data = await request(`/api/blocked`, "POST", {
        data: item,
      });
    } catch (error) {}
  }, []);

  const blockButton = (item) => {
    /**
        <i className="material-icons">lock</i>
        <i className="material-icons green-text">lock_open</i>
        <i className="material-icons red-text">lock_outline</i>
        <i className="material-icons">no_encryption</i>
        <i className="material-icons">public</i>
        <i className="material-icons red-text">vpn_lock</i> */
    console.log(item.blocked);
    let style;
    let icon;
    if (item.blocked) {
      style = "btn waves-effect waves-light blocked";
      icon = <i className="material-icons">lock_outline</i>;
    } else {
      style = "btn waves-effect waves-light unblocked";
      icon = <i className="material-icons">lock_open</i>;
    }

    return (
      <button
        className={style}
        name="blocked"
        onClick={() => {
          blocked(item);
        }}
      >
        {icon}
      </button>
    );
  };

  const updateHandler = (event) => {
    let name = event.target.name;
    let value = event.target.value;
    let state = form;
    if (name === "push" || name === "clientToClient") {
      state[name] = !state[name];
    } else {
      state[name] = value;
    }
    setForm(state);
    console.log("измененное: ", form);
  };

  useEffect(() => {
    message(error);
    clearError();
  }, [error, message, clearError]);

  useEffect(() => {
    setForm(config);
    console.log(config);
  }, [config]);

  useEffect(() => {
    var elems = document.querySelectorAll(".modal");
    window.M.Modal.init(elems, { dismissible: false });
  });

  /*useEffect(() => {
    downloadConfig();
  }, [downloadConfig]);*/

  useEffect(() => {
    downloadList();
  }, [downloadList]);

  /** изменение конфига
   * {!!config && (
        <ConfigOpenVNP
          service={service}
          form={form}
          updateHandler={updateHandler} 
          saveConfig={saveConfig}
          setForm={setForm}
        />
      )} */

  if (redirect) {
    console.log("redirect");
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="block row center z-depth-2">
      <div className="row center">
        <div className="col s4 offset-s4">
          <table>
            <tbody>
              <tr style={{ borderBottom: "none" }}>
                <td className="center">
                  <span style={{ fontSize: "2.5em" }}>{service}</span>
                </td>
                {!service.includes("@admin") &&
                  !service.includes("@device") &&
                  !service.includes("@client") &&
                  service.includes("@") && (
                    <td>
                      <Modal
                        nameButton={<i className="material-icons">delete</i>}
                        styleButton="delete"
                        modalHeader="Внимание"
                        modalBody={`Вы уверены, что хотите удалить сервер ${service}?`}
                        modalFuncion={() => {
                          deleteClient(
                            service.split("@")[1],
                            service.split("@")[0]
                          );
                        }}
                      />
                    </td>
                  )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="row center">
        {loading && <Loader text={"Идет загрузка списка."} />}
        {!loading && (
          <ListService
            list={list}
            listLength={listLength}
            downloadButton={downloadButton}
            deleteClient={deleteClient}
            blockButton={blockButton}
            service={service}
          />
        )}
      </div>
    </div>
  );
};
