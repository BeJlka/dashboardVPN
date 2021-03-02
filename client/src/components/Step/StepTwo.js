import React, { useEffect } from "react";

export const StepTwo = (props) => {
  const name = props.name;
  const config = props.config;
  const createOVPN = props.createOVPN;

  const changeHandler = (event) => {
    let evName = event.target.name;
    let state = config;
    console.log(state)
    if (evName === "proto") {
      console.log(evName, event.target.value);
      state[name].network.proto = event.target.value;
    } else if (evName === "friends") {
      console.log(evName, event.target.checked);
      state[name].friends = event.target.checked;
    } else if (evName === "name") {
      console.log(evName, event.target.value);
      state[name].name = event.target.value;
    }else if (evName === "type") {
      console.log(evName, event.target.value);
      state[name][evName] = event.target.value;
    }
  };

  useEffect(() => {
    let elems = document.querySelectorAll("select");
    window.M.FormSelect.init(elems, {});
  });

  useEffect(() => {
    window.M.updateTextFields();
  }, []);

  return (
    <div className="center">
      <h4>Шаг второй</h4>
      <h6>Имя сервера: {name}</h6>
      <div className="col s8 offset-s2">
        <div className="row ">
          <div className="input-field col s12">
            <input
              defaultValue={config[name].description}
              id="name"
              type="text"
              name="name"
              onChange={(e) => changeHandler(e)}
            />
            <label className="active" htmlFor="about">
              Для чего/кого
            </label>
          </div>
        </div>
        <div className="row">
          <div className="input-field col s6">
            <input
              defaultValue={config[name].network.internet}
              id="internet"
              type="text"
              disabled
            />
            <label className="active" htmlFor="internet">
              ip
            </label>
          </div>
          <div className="input-field col s6">
            <input
              defaultValue={config[name].network.port}
              id="port"
              type="text"
              disabled
            />
            <label className="active" htmlFor="port">
              port
            </label>
          </div>
        </div>
        <div className="row">
          <div className="input-field col s6">
            <input
              defaultValue={config[name].network.mport}
              id="mport"
              type="text"
              disabled
            />
            <label className="active" htmlFor="mport">
              mport
            </label>
          </div>
          <div className="input-field col s6">
            <input
              defaultValue={config[name].network.dev}
              id="dev"
              type="text"
              disabled
            />
            <label className="active" htmlFor="dev">
              dev
            </label>
          </div>
        </div>
        <div className="row">
          <div className="input-field col s6">
            <select
              defaultValue={config[name].network.type}
              name="type"
              onChange={(e) => changeHandler(e)}
            >
              <option value="public">public</option>
              <option value="root">root</option>
            </select>
            <label>type</label>
          </div>
          <div className="input-field col s6">
            <select
              defaultValue={config[name].network.proto}
              name="proto"
              onChange={(e) => changeHandler(e)}
            >
              <option value="udp">udp</option>
              <option value="tcp">tcp</option>
            </select>
            <label>proto</label>
          </div>
        </div>
        <div className="row">
          <div className="input-field col s6">
            <label>
              <input
                type="checkbox"
                name="friends"
                className="filled-in"
                defaultChecked={config[name].friends}
                onChange={(e) => changeHandler(e)}
              />
              <span>friends</span>
            </label>
          </div>
        </div>
        <div className="row">
          <button
            className="btn waves-effect waves-light right"
            name="action"
            onClick={() => createOVPN(config, name)}
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
};
