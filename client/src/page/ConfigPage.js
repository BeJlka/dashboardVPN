import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useHttp } from "../hooks/http.hook";
import { useMessage } from "../hooks/message.hook";
import { Loader } from "../components/Loader";

export const ConfigPage = () => {
  const service = useParams().service;
  const { loading, request, error, clearError } = useHttp();
  const message = useMessage();
  const [config, setConfig] = useState();
  let style = {
    width: "100%",
    height: "50vh",
    //minHeight: "300px",
    //minWidth: "500px",
    resize: "none",
    backgroundColor: "#fff",
    border: "none",
  };

  const fetchConfig = useCallback(async () => {
    try {
      const data = await request(`/api/config/${service.split(".")[0]}`);
      setConfig(data);
    } catch (error) {}
  }, [request, service]);

  const saveConfig = useCallback(
    async (config) => {
      try {
        const data = await request(`/api/saveconfig`, "POST", {
          service: service.split(".")[0],
          data: config,
        });
        console.log(data);
        message(data.message);
      } catch (error) {}
    },
    [request, service, message]
  );

  const configHandler = (event) => {
    console.log(event.target.name + " : " + event.target.value);
    setConfig(event.target.value);
  };

  /*value={config}
  onChange={(e) => configHandler(e)}*/

  useEffect(() => {
    message(error);
    clearError();
  }, [error, message, clearError]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <>
      {loading && <Loader />}
      {!loading && (
        <div
          className="block row center z-depth-2"
        >
          <h4>Страница настройки</h4>
          {!!config && (
            <>
              <h5>{service}</h5>
              <div className="row">
                <div className="input-field col s8 offset-s2">
                  <textarea
                    style={style}
                    name="config"
                    defaultValue={config}
                    onChange={(e) => configHandler(e)}
                  />
                </div>
                <div className="input-field col s8 offset-s2 right">
                  <button
                    className="btn waves-effect waves-light"
                    type="submit"
                    name="action"
                    onClick={() => saveConfig(config)}
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
