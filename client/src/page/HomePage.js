import React from "react";
import { Link } from "react-router-dom";

export const HomePage = () => {
  return (
    <div className="row center">
      <h1>HomePage</h1>
      <div>
        <Link to="/dashboard">
          <button className="btn waves-effect waves-light" name="dashboard">
            Список служб
          </button>
        </Link>
        <Link to="/test">
          <button className="btn waves-effect waves-light" name="dashboard">
            тест
          </button>
        </Link>
      </div>
    </div>
  );
};
