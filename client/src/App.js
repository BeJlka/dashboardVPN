import React, { useEffect, useCallback, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useRoutes } from './routes';
import { Sidenav } from './components/Sidenav';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useHttp } from './hooks/http.hook';
import config from './config.json';
import 'materialize-css';

function App() {
  const router = useRoutes();
  const { loading, request, error, clearError } = useHttp();
  // const obj = {
  //   openvpn: config.vpnReq,
  //   firewall: config.firewallReq,
  //   service: config.serviceReq,
  // };

  // const [service, setService] = useState({
  //   openvpn: [],
  //   firewall: [],
  //   service: [],
  // });

  // const fetchData = useCallback(async () => {
  //   try {
  //     console.log("Запрос OpenVPN, IpTables, Service");
  //     const data = await request(`/api/service`, "POST", {
  //       service: obj,
  //     });
  //     setService(data);
  //   } catch (error) {}
  // }, [request]);

  // useEffect(() => {
  //   fetchData();
  // }, [fetchData]);

  useEffect(() => {
    var elems = document.querySelectorAll('.collapsible');
    window.M.Collapsible.init(elems, {});
  }, []);

  return (
    <BrowserRouter>
      <header>
        <Navbar />
        <Sidenav />
      </header>
      <main className="row container">
        <div className="col s12 center">{router}</div>
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
