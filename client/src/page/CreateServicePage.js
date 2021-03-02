import React, { useCallback, useEffect, useState } from "react";
import { useHttp } from "../hooks/http.hook";
import { useMessage } from "../hooks/message.hook";
import { StepOne } from "../components/Step/StepOne";
import { StepTwo } from "../components/Step/StepTwo";
import { Redirect } from "react-router-dom";
import { Loader } from "../components/Loader";

export const CreateServicePage = () => {
  const [step, setStep] = useState("StepOne");
  const [name, setName] = useState();
  const [redirect, setRedirect] = useState(false);
  const [config, setConfig] = useState();
  const { loading, request, error, clearError } = useHttp();
  const message = useMessage();

  const checkOVPN = useCallback(
    async (name) => {
      try {
        const data = await request(`/api/checkovpn`, "POST", { name: name });
        console.log(data);
        if (data.success) {
          setConfig(data.config);
          setStep("StepTwo");
        } else {
          message(data.message);
        }
      } catch (error) {}
    },
    [message, request]
  );

  const createOVPN = useCallback(
    async (config, name) => {
      try {
        message(
          "Идет создание сервера VPN. Этот процесс может занимать до 2-х минут"
        );
        const data = await request(`/api/createovpn`, "POST", {
          name: name,
          config: config,
        });
        if (data.success) {
          message(data.message);
          setTimeout(() => {
            setRedirect(true);
          }, 3000);
        } else {
          message(data.message);
        }
      } catch (error) {}
    },
    [message, request]
  );

  const nextStep = () => {
    const rs = /^[a-zA-Z][a-zA-Z0-9]{1,10}$/;
    if (rs.test(name) && name !== undefined) {
      console.log(name);
      checkOVPN(name);
    } else message("Имя введенно не верно");
  };

  useEffect(() => {
    message(error);
    clearError();
  }, [error, message, clearError]);

  if (redirect) {
    console.log(name);
    return <Redirect to={`/create/openvpn@${name}.service`}></Redirect>;
  }

  return (
    <>
      {loading && (
        <Loader loader={"loader-dashboadr"} text={"Идет загрузка."} />
      )}
      {!loading && (
        <div className="block row center z-depth-2">
          <h3>Создание нового VPN сервиса</h3>
          {step === "StepOne" && (
            <StepOne name={name} setName={setName} nextStep={nextStep} />
          )}
          {step === "StepTwo" && (
            <StepTwo
              name={name}
              config={config}
              setConfig={setConfig}
              createOVPN={createOVPN}
            />
          )}
        </div>
      )}
    </>
  );
};
