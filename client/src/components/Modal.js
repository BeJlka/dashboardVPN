import React from "react";

export const Modal = (props) => {
  let style = "waves-effect waves-light btn modal-trigger";
  if (props.styleButton) {
    style = style + " " + props.styleButton;
  }

  return (
    <>
      <a className={style} href="#modal1">
        {props.nameButton}
      </a>

      <div id="modal1" className="modal">
        <div className="modal-content center">
          <h3>{props.modalHeader}</h3>
          <p>{props.modalBody}</p>
        </div>
        <div className="modal-footer">
          <a
            id="close"
            href="#!"
            className="modal-close waves-effect waves btn"
            style={{ marginRight: "10px" }}
          >
            Отмена
          </a>
          <a
            id="ok"
            href="#!"
            className="modal-close waves-effect waves btn"
            onClick={props.modalFuncion}
          >
            Да
          </a>
        </div>
      </div>
    </>
  );
};
