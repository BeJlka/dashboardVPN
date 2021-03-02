import React from "react";

export const StepOne = (props) => {
  const setName = props.setName;

  const changeHandler = (event) => {
    console.log(event.target.id);
    setName(event.target.value);
  };

  return (
    <div>
      <h4>Шаг первый</h4>
      <div className="input-field inline">
        <input id="name" type="text" onChange={(e) => changeHandler(e)} />
        <label htmlFor="name">Имя сервиса</label>
      </div>
      <div>
        <button
          className="btn waves-effect waves-light"
          name="action"
          onClick={() => props.nextStep()}
        >
          Далее
        </button>
      </div>
    </div>
  );
};
