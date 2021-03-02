import React from "react";
import { Link } from "react-router-dom";

export const ListService = (props) => {
  const list = props.list;
  const listLength = props.listLength;
  const downloadButton = props.downloadButton;
  const deleteClient = props.deleteClient;
  const blockButton = props.blockButton;
  const service = props.service;

  return (
      <div className="col s6 offset-s3">
        {listLength && <h3>Список пуст</h3>}
        {!!list && !listLength && (
          <table className="highlight">
            {service.includes("@") && (
              <>
                <thead>
                  <tr>
                    <th className="center">№</th>
                    <th className="center">Имя клиента</th>
                    <th className="center">Server</th>
                    <th className="center">Block</th>
                    <th className="center">Удалить</th>
                    <th className="center">Скачать</th>
                  </tr>
                </thead>
                <tbody>
                  {console.log(list)}
                  {list.map((item, index) => {
                    return (
                      <tr key={item.code.toString()}>
                        <td className="center">
                          {index + 1}/{list.length}
                        </td>
                        <td className="center">{item.code}</td>
                        <td className="center">{item.server}</td>
                        <td className="center">{blockButton(item)}</td>
                        <td className="center">
                          <button
                            className="btn waves-effect waves-light delete"
                            name="delete"
                            onClick={() => {
                              deleteClient(item, service);
                            }}
                          >
                            <i className="material-icons">delete</i>
                          </button>
                        </td>
                        <td className="center">{downloadButton(item)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
            {service === "mosquitto" && (
              <>
                <thead>
                  <tr>
                    <th className="center">№</th>
                    <th className="center">Имя клиента</th>
                    <th className="center">Удалить</th>
                  </tr>
                </thead>
                <tbody>
                  {console.log(list)}
                  {list.map((item, index) => {
                    return (
                      <tr key={item.toString()}>
                        <td className="center">
                          {index + 1}/{list.length}
                        </td>
                        <td className="center">{item}</td>
                        <td className="center">
                          <button
                            className="btn waves-effect waves-light delete"
                            name="delete"
                            onClick={() => {
                              deleteClient(item, service);
                            }}
                          >
                            <i className="material-icons">delete</i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        )}
        <Link to={`/create/${service}`}>
          <button className="btn waves-effect waves-light right">
            <i className="material-icons">add</i>
          </button>
        </Link>

      </div>
  );
};
