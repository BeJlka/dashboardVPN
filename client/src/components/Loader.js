import React from "react";

export const Loader = (props) => {
  let style = "";
  if (props.loader) {
    style = `${props.loader}`;
  }

  return (
    <div className={style}>
      <div className="preloader-wrapper big active">
        <div className="spinner-layer spinner-blue-only">
          <div className="circle-clipper left">
            <div className="circle"></div>
          </div>
          <div className="gap-patch">
            <div className="circle"></div>
          </div>
          <div className="circle-clipper right">
            <div className="circle"></div>
          </div>
        </div>
      </div>
      <h4>{props.text}</h4>
    </div>
  );
};
