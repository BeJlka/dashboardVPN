import React from "react";
import { Link } from "react-router-dom";

export const DashboardTable = (props) => {
  let service = props.service;
  let createButton = props.createButton;
  let data = props.data;

  const circleColor = (SUB) => {
    let color;
    if (SUB === "running") {
      color = "green";
    } else if (SUB === "dead") {
      color = "red";
    } else if (SUB === "exited") {
      color = "yellow";
    }

    return <i className={`material-icons ${color}-text`}>lens</i>;
  };

  /**<td className="center">
                      <Link to={`/create/${item.UNIT}`}>
                        <button className="btn waves-effect waves-light blue">
                          <i className="material-icons">add</i>
                        </button>
                      </Link>
                    </td>
                    <td className="center">
                      <Link to={`/list/${item.UNIT}`}> 
                        <button className="btn waves-effect waves-light blue">
                          <i className="material-icons">content_paste</i>
                        </button>
                      </Link>
                    </td> */
  // #f5f5f5 grey lighten-4
  return (
    <div className="block dashboard center z-depth-2">
      <table className="highlight">
        <thead>
          <tr>
            <th colSpan="5">
              <h5 className="left">{props.name}</h5>
            </th>
            <th colSpan="1" className="center">
              {props.name === "OpenVPN" && (
                <Link to={"/createovpn"}>
                  <button className="btn waves-effect waves-light">
                    <i className="material-icons">add</i>
                  </button>
                </Link>
              )}
            </th>
            <th colSpan="1" className="center">
              {props.name === "OpenVPN" && (
                <Link to={"/create/openvpn@client&mosquitto"}>
                  <button className="btn waves-effect waves-light">
                    <i className="material-icons">person_add</i>
                  </button>
                </Link>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {service.map((item, index) => {
            return (
              <tr key={index}>
                <td
                  className="center"
                  style={{ maxWidth: "200px", minWidth: "200px" }}
                >
                  {item.UNIT}
                </td>
                <td
                  className="center"
                  style={{ maxWidth: "35px", minWidth: "35px" }}
                >
                  {circleColor(item.SUB)}
                </td>
                <td
                  className="center"
                  style={{ maxWidth: "60px", minWidth: "60px" }}
                >
                  {item.SUB}
                </td>
                <td
                  className="center"
                  style={{ maxWidth: "60px", minWidth: "60px" }}
                >
                  {createButton(
                    item,
                    "start",
                    <i className="material-icons">play_arrow</i>
                  )}
                </td>
                <td
                  className="center"
                  style={{ maxWidth: "60px", minWidth: "60px" }}
                >
                  {createButton(
                    item,
                    "stop",
                    <i className="material-icons">stop</i>
                  )}
                </td>
                <td
                  className="center"
                  style={{ maxWidth: "60px", minWidth: "60px" }}
                >
                  {createButton(
                    item,
                    "restart",
                    <i className="material-icons">refresh</i>
                  )}
                </td>
                {data === "config" && (
                  <td
                    className="center"
                    style={{ maxWidth: "60px", minWidth: "60px" }}
                  >
                    <Link
                      className="btn waves-effect waves-light"
                      to={`/config/${item.UNIT}`}
                    >
                      <i className="material-icons">content_paste</i>
                    </Link>
                  </td>
                )}
                {data === "settings" && item.UNIT.includes("@") && (
                  <td
                    className="center"
                    style={{ maxWidth: "60px", minWidth: "60px" }}
                  >
                    <Link
                      className="btn waves-effect waves-light"
                      to={`/settings/${item.UNIT}`}
                    >
                      <i className="material-icons">vpn_key</i>
                    </Link>
                  </td>
                )}
                {item.UNIT.split(".")[0] === "mosquitto" && (
                  <td
                    className="center"
                    style={{ maxWidth: "60px", minWidth: "60px" }}
                  >
                    <Link
                      className="btn waves-effect waves-light"
                      to={`/settings/${item.UNIT}`}
                    >
                      <i className="material-icons">content_paste</i>
                    </Link>
                  </td>
                )}
                {item.UNIT.split(".")[0] != "mosquitto" &&
                  data != "config" &&
                  !item.UNIT.includes("openvpn@") && (
                    <td
                      className="center"
                      style={{ maxWidth: "60px", minWidth: "60px" }}
                    ></td>
                  )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
