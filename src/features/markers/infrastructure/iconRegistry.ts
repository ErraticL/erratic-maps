import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconType } from "react-icons";
import {
  FaBuilding,
  FaCamera,
  FaCircle,
  FaFlag,
  FaHeart,
  FaHouse,
  FaLocationDot,
  FaMoon,
  FaPaperPlane,
  FaRegSnowflake,
  FaShop,
  FaSquare,
  FaStar,
  FaSun,
  FaTree,
  FaXmark,
} from "react-icons/fa6";
import { IoMdFlower } from "react-icons/io";
import { SlTarget } from "react-icons/sl";
import type { MarkerIconDefinition } from "@/features/markers/domain/types";
import { MARKER_FEATURED_ICON_COUNT } from "@/features/markers/infrastructure/constants";

function createSvgIcon(id: string, label: string, component: IconType) {
  return {
    id,
    label,
    source: "predefined",
    kind: "svg",
    component,
    svgMarkup: renderToStaticMarkup(
      createElement(component, {
        size: 24,
        color: "currentColor",
        "aria-hidden": true,
      }),
    ),
  } satisfies MarkerIconDefinition;
}

function createImageIcon(id: string, label: string, sourcePath: string) {
  return {
    id,
    label,
    source: "predefined",
    kind: "image",
    dataUrl: sourcePath,
    tintWithMarkerColor: true,
  } satisfies MarkerIconDefinition;
}

export const predefinedMarkerIcons: MarkerIconDefinition[] = [
  createImageIcon("app-marker", "Erratic Maps", "/assets/marker.svg"),
  createSvgIcon("pin", "Pin", FaLocationDot),
  createSvgIcon("heart", "Heart", FaHeart),
  createSvgIcon("home", "Home", FaHouse),
  createSvgIcon("star", "Star", FaStar),
  createSvgIcon("circle", "Circle", FaCircle),
  createSvgIcon("square", "Square", FaSquare),
  createSvgIcon("x", "X", FaXmark),
  createSvgIcon("target", "Target", SlTarget),
  createSvgIcon("sun", "Sun", FaSun),
  createSvgIcon("moon", "Moon", FaMoon),
  createSvgIcon("building", "Building", FaBuilding),
  createSvgIcon("send", "Send", FaPaperPlane),
  createSvgIcon("snowflake", "Snowflake", FaRegSnowflake),
  createSvgIcon("shop", "Shop", FaShop),
  createSvgIcon("camera", "Camera", FaCamera),
  createSvgIcon("flower", "Flower", IoMdFlower),
  createSvgIcon("tree", "Tree", FaTree),
  createSvgIcon("flag", "Flag", FaFlag),
];

export const featuredMarkerIcons = predefinedMarkerIcons.slice(
  0,
  MARKER_FEATURED_ICON_COUNT,
);

export function getAllMarkerIcons(customIcons: MarkerIconDefinition[]) {
  return [...predefinedMarkerIcons, ...customIcons];
}

export function findMarkerIcon(
  iconId: string,
  customIcons: MarkerIconDefinition[],
) {
  return (
    getAllMarkerIcons(customIcons).find((icon) => icon.id === iconId) ?? null
  );
}
