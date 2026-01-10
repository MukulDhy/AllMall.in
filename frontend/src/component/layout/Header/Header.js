import React from "react";
import { ReactNavbar } from "overlay-navbar";
import { useLocation } from "react-router-dom";
import logo from "../../../images/logo.png";

const Header = () => {
  const location = useLocation();

  const options = {
    burgerColorHover: "#eb4034",
    logo,
    logoWidth: "20vmax",

    navColor1: "#ffffffff",

    logoHoverSize: "10px",
    logoHoverColor: "#eb4034",

    link1Text: "Home",
    link2Text: "Products",
    link3Text: "Contact",
    link4Text: "About",

    link1Url: "/",
    link2Url: "/products",
    link3Url: "/contact",
    link4Url: "/about",

    link1Size: "1.3vmax",

    // Default link color
    link1Color: "rgba(35, 35, 35, 0.8)",

    // 🔴 ACTIVE LINK COLOR
    link1ColorActive: "#eb4034",

    // Hover color
    link1ColorHover: "#eb4034",

    link1Margin: "1vmax",

    nav1justifyContent: "flex-end",
    nav2justifyContent: "flex-end",
    nav3justifyContent: "flex-start",
    nav4justifyContent: "flex-start",

    profileIconUrl: "/login",
    profileIconColor: "rgba(35, 35, 35, 0.8)",
    searchIconColor: "rgba(35, 35, 35, 0.8)",
    cartIconColor: "rgba(35, 35, 35, 0.8)",

    profileIconColorHover: "#eb4034",
    searchIconColorHover: "#eb4034",
    cartIconColorHover: "#eb4034",

    cartIconMargin: "1vmax",
  };

  return (
    // 🔥 KEY forces navbar to CLOSE on route change
    <ReactNavbar key={location.pathname} {...options} />
  );
};

export default Header;
