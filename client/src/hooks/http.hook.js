import { useState, useCallback } from "react";

export const useHttp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null)

  const request = useCallback(
    async (url, method = "GET", body = null, headers = {}) => {
      setLoading(true);
      try {
        if (body) {
          body = JSON.stringify(body);
          headers["Content-type"] = "application/json";
        }
        
        /*console.log("url: ", url)
        console.log("method: ", method)
        console.log("body: ", body)
        console.log("headers: ", headers)*/
        const response = await fetch(url, { method, body, headers });
        const data = await response.json();
        console.log(response);
        if(!response.ok) {
          throw new Error(data.message || "Что-то пошло не так. Попробуйте еще раз.");
        }
        setLoading(false);
        return data;
      } catch (error) {
        setLoading(false)
        setError(error.message);
        throw error;
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { loading, request, error, clearError };
};
