import React, { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useHttp } from "../hooks/http.hook";

export const TestPage = () => {
  const { loading, request, error, clearError } = useHttp();
  useEffect(() => {
    var elems = document.querySelectorAll(".sidenav");
    window.M.Sidenav.init(elems, {});
  });
  useEffect(() => {
    var elems = document.querySelectorAll(".modal");
    window.M.Modal.init(elems, {});
  });

  const fetchData = useCallback(async () => {
    try {
      const dataService = await request(`/api/test`);
    } catch (error) {}
  }, [request]);

  return (
    <div className="row center">
      <h1>TestPage</h1>

      <a className="waves-effect waves-light btn" onClick={fetchData}>
        Запрос
      </a>
    </div>
  );
};
