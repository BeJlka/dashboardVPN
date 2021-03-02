import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useHttp } from "../hooks/http.hook";
import { Redirect } from "react-router-dom";
import { useMessage } from "../hooks/message.hook";
import { Loader } from "../components/Loader";

export const CreateClientPage = ({}) => {
  const [nameClient, setNameClient] = useState();
  const [passwordClient, setPasswordClient] = useState();
  const [redirect, setRedirect] = useState(false);
  const message = useMessage();
  const { loading, request, error, clearError } = useHttp();
  const server = useParams().server.split(".")[0];
  //console.log(window.ip)

  const createClient = async () => {
    const rs = /^[a-zA-Z][a-zA-Z0-9]{1,15}$/;
    try {
      if (rs.test(nameClient)) {
        let name = server;
        if (!server.includes("@")) {
          if (nameClient != server) {
            message(
              "Клиент создается. Время ожидания может составлять до 2-х минут"
            );
          } else {
            message("Имя клиента и сервера не могут совпадать.");
            return;
          }
        } else {
          if (nameClient != server.split("&")[0].split("@")[1]) {
            name = server.split("@")[1];
            message("Клиент создается.");
          } else {
            message("Имя клиента и сервера не могут совпадать.");
            return;
          }
        }
        console.log(
          `server: ${name}, code: ${nameClient}, password: ${passwordClient}`
        );
        const data = await request(`/api/service/create`, "POST", {
          server: name,
          code: nameClient,
          password: passwordClient,
        });
        if (data.success) {
          message("Клиент создан");
          setTimeout(() => setRedirect(true), 2000);
        } else {
          message(data.message);
        }
      } else {
        if (!server.includes("@")) {
          message(
            "Имя службы/демона должно содержать латинские буквы и цифры,и начинаться с латинской буквы.Длина должна быть меньше 16 символов"
          );
        } else {
          message(
            "Имя должно содержать латинские буквы и цифры,и начинаться с латинской буквы."
          );
        }
      }
    } catch (error) {}
  };

  useEffect(() => {
    message(error);
    clearError();
  }, [error, message, clearError]);

  if (redirect) {
    return <Redirect to={`/settings/${server.split("&")[0]}`}></Redirect>;
  }

  return (
    <>
      {loading && <Loader loader={"loader-dashboadr"} text={"Идет загрузка"} />}
      {!loading && (
        <div className="block row center z-depth-2">
          <h3>{server.split("&")[0]}</h3>
          <div className="input-field inline">
            <input
              id="name"
              type="text"
              data-length="16"
              onChange={(e) => setNameClient(e.target.value)}
            />
            <label htmlFor="name">Имя</label>
            <em>Введите имя клиента</em>
          </div>
          {(!server.includes("@") || server.includes("&")) && (
            <div className="input-field inline">
              <input
                id="password"
                type="text"
                onChange={(e) => setPasswordClient(e.target.value)}
              />
              <label htmlFor="password">Пароль</label>
              <em>Введите пароль</em>
            </div>
          )}

          <div>
            <button
              className="btn waves-effect waves-light"
              type="submit"
              name="action"
              onClick={createClient}
            >
              Создать
            </button>
          </div>
        </div>
      )}
    </>
  );
};
