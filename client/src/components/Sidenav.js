import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";

export const Sidenav = () => {
  useEffect(() => {
    var elems = document.querySelectorAll(".sidenav");
    window.M.Sidenav.init(elems, {});
  }, []);

  return (
    <>
      <ul id="slide-out" className="sidenav sidenav-fixed white-text">
          <a href="/dashboard" className="brand-logo center">
            <h2 className="white-text"  style={{marginTop: "30px", marginBottom: "30px"}}>Лого</h2>
          </a>
        <ul className="collapsible" style={{ borderTop: "1px solid white" }}>
          <li>
            <div className="collapsible-header waves-effect">Firewall</div>
            <div className="collapsible-body">
              <ul
                className="collapsible"
                style={{ borderBottom: "1px solid white" }}
              >
                <li>
                  <div
                    className="collapsible-header waves-effect"
                    style={{ paddingLeft: "32px" }}
                  >
                    iptables
                  </div>
                  <div className="collapsible-body">
                    <ul style={{ paddingLeft: "48px" }}>
                      <li>
                        <span>Старт</span>
                      </li>
                      <li>
                        <span>Стоп</span>
                      </li>
                      <li>
                        <span>Перезапустить</span>
                      </li>
                      <li>
                        <span>Конфигурация</span>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </li>
          <li>
            <div className="collapsible-header waves-effect">OpenVPN</div>
            <div className="collapsible-body">
              <ul
                className="collapsible"
                style={{ borderBottom: "1px solid white" }}
              >
                <li>
                  <div
                    className="collapsible-header waves-effect"
                    style={{ paddingLeft: "32px" }}
                  >
                    admin
                  </div>
                  <div className="collapsible-body">
                    <span style={{ paddingLeft: "48px" }}>Заглушка</span>
                  </div>
                </li>
                <li>
                  <div
                    className="collapsible-header waves-effect"
                    style={{ paddingLeft: "32px" }}
                  >
                    device
                  </div>
                  <div className="collapsible-body">
                    <span style={{ paddingLeft: "48px" }}>Заглушка</span>
                  </div>
                </li>
              </ul>
            </div>
          </li>
          <li>
            <div className="collapsible-header waves-effect">Service</div>
            <div className="collapsible-body">
              <ul
                className="collapsible"
                style={{ borderBottom: "1px solid white" }}
              >
                <li>
                  <div
                    className="collapsible-header waves-effect"
                    style={{ paddingLeft: "32px" }}
                  >
                    mongodb
                  </div>
                  <div className="collapsible-body">
                    <span style={{ paddingLeft: "48px" }}>Заглушка</span>
                  </div>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </ul>
    </>
  );
};
