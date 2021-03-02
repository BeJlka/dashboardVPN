import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

export const Navbar = () => {
  useEffect(() => {
    var elems = document.querySelectorAll('.sidenav');
    window.M.Sidenav.init(elems, {});
  }, []);

  return (
    <>
      <nav>
        <div className="nav-wrapper">
          <div className="container">
            <a
              href="#"
              data-target="slide-out"
              className="top-nav sidenav-trigger full"
            >
              <i className="material-icons">menu</i>
            </a>
            <ul className="right ">
              <li>
                <NavLink to="/dashboard">Dashboard</NavLink>
              </li>
              <li>
                <NavLink to="/test">Test</NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};
