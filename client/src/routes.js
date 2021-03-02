import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import { DashboardPage } from "./page/DashboardPage";
import { HomePage } from "./page/HomePage";
import { CreateClientPage } from "./page/CreateClientPage";
import { SettingsPage } from "./page/SettingsPage";
import { ConfigPage } from "./page/ConfigPage";
import { CreateServicePage } from "./page/CreateServicePage";
import { TestPage } from "./page/TestPage";

export const useRoutes = () => {
  return (
    <Switch>
      <Route path="/home">
        <HomePage />
      </Route>
      <Route path="/dashboard">
        <DashboardPage />
      </Route>
      <Route path="/createovpn">
        <CreateServicePage />
      </Route>
      <Route path="/create/:server"> 
        <CreateClientPage />
      </Route>
      <Route path="/settings/:service">
        <SettingsPage />
      </Route>
      <Route path="/test">
        <TestPage />
      </Route>
      
      <Route path="/config/:service">
        <ConfigPage />
      </Route>
      <Redirect to="/dashboard" />
    </Switch>
  );
};
