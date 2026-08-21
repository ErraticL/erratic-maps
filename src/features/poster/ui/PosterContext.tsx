import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  posterReducer,
  type PosterState,
  type PosterAction,
  type PosterForm,
} from "../application/posterReducer";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { applyThemeColorOverrides } from "@/features/theme/domain/colorPaths";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import { applyPlate } from "@/features/map/infrastructure/plateTransform";
import { applyRelief } from "@/features/map/infrastructure/reliefTransform";
import {
  clampPlateWeight,
  isPlateFills,
  DEFAULT_PLATE,
  type Plate,
} from "@/features/map/domain/plate";
import {
  isContourInterval,
  isHillshadeStrength,
  DEFAULT_RELIEF,
  type Relief,
} from "@/features/map/domain/relief";
import {
  clampMat,
  isSheetMask,
  isTextPosition,
  DEFAULT_SHEET,
  type Sheet,
} from "@/features/poster/domain/sheet";
import type { StyleSpecification } from "maplibre-gl";
import type { MapInstanceRef } from "@/features/map/domain/types";
import { createDefaultMarkerSettings } from "@/features/markers/infrastructure/helpers";
import {
  loadCustomMarkerIcons,
  saveCustomMarkerIcons,
} from "@/features/markers/infrastructure/customIconStorage";
import { createDefaultRouteSettings } from "@/features/routes/infrastructure/helpers";

/* ────── Default form (moved from appConfig) ────── */

import {
  defaultLayoutId,
  getLayoutOption,
} from "@/features/layout/infrastructure/layoutRepository";
import { defaultThemeName } from "@/features/theme/infrastructure/themeRepository";
import {
  DEFAULT_POSTER_WIDTH_CM,
  DEFAULT_POSTER_HEIGHT_CM,
  DEFAULT_DISTANCE_METERS,
  DEFAULT_LAT,
  DEFAULT_LON,
} from "@/core/config";
import { readStartupPermalink } from "@/features/share/infrastructure/permalinkLocation";
import { usePermalinkSync } from "@/features/share/application/usePermalinkSync";
import {
  permalinkCustomColors,
  permalinkFormFields,
} from "@/features/share/application/permalinkForm";
import { readStoredResolution } from "@/features/export/application/resolutionStorage";
import type { PermalinkData } from "@/features/share/domain/permalink";

const defaultLayoutOption = getLayoutOption(defaultLayoutId);
const defaultLayoutWidthCm = Number(
  defaultLayoutOption?.widthCm ?? DEFAULT_POSTER_WIDTH_CM,
);
const defaultLayoutHeightCm = Number(
  defaultLayoutOption?.heightCm ?? DEFAULT_POSTER_HEIGHT_CM,
);
const DEFAULT_LOCATION_LABEL =
  "Hanover, Region Hannover, Lower Saxony, Germany";

export const DEFAULT_FORM: PosterForm = {
  location: DEFAULT_LOCATION_LABEL,
  latitude: DEFAULT_LAT.toFixed(6),
  longitude: DEFAULT_LON.toFixed(6),
  distance: String(DEFAULT_DISTANCE_METERS),
  width: String(defaultLayoutWidthCm),
  height: String(defaultLayoutHeightCm),
  theme: defaultThemeName,
  layout: defaultLayoutId,
  displayCity: "Hanover",
  displayCountry: "Germany",
  displayContinent: "Europe",
  fontFamily: "",
  includeCredits: true,
  includeLandcover: true,
  // Erratic Maps default: ON, so the height-triad themes show their
  // three-tone buildings without a trip to the Layers panel.
  includeBuildings: true,
  includeWater: true,
  includeParks: true,
  includeAeroway: true,
  includeRail: true,
  includeRoads: true,
  includeRoadPath: true,
  includeRoadMinorLow: true,
  includeRoadOutline: true,
  plateWeight: String(DEFAULT_PLATE.weight),
  plateFills: DEFAULT_PLATE.fills,
  plateCasings: DEFAULT_PLATE.casings,
  sheetMat: String(Math.round(DEFAULT_SHEET.mat * 100)),
  sheetText: DEFAULT_SHEET.textPosition,
  sheetMask: DEFAULT_SHEET.mask,
  reliefContours: DEFAULT_RELIEF.contours,
  reliefInterval: DEFAULT_RELIEF.contourInterval,
  reliefHillshade: DEFAULT_RELIEF.hillshade,
  reliefStrength: DEFAULT_RELIEF.hillshadeStrength,
  showMarkers: true,
  showRoutes: true,
};

/**
 * Applies a startup permalink (URL hash) on top of the default form.
 * Every value is validated against the same bounds and registries the
 * UI uses; an invalid value falls back to the default silently.
 */
const startupPermalink = readStartupPermalink();

const INITIAL_STATE: PosterState = {
  form: startupPermalink
    ? { ...DEFAULT_FORM, ...permalinkFormFields(startupPermalink) }
    : DEFAULT_FORM,
  customColors: startupPermalink ? permalinkCustomColors(startupPermalink) : {},
  markers: [],
  customMarkerIcons: [],
  markerDefaults: {
    ...createDefaultMarkerSettings(),
    color: getTheme(defaultThemeName).ui.text,
  },
  isMarkerEditorActive: false,
  activeMarkerId: null,
  routes: [],
  routeDefaults: {
    ...createDefaultRouteSettings(),
    color: getTheme(defaultThemeName).ui.text,
  },
  error: "",
  isExporting: false,
  exportPhase: "",
  // The export resolution of this device, from the last visit. An
  // empty setting means "take the default of this device".
  exportResolution: readStoredResolution(),
  isLocationFocused: false,
  selectedLocation: null,
  userLocation: null,
  // Names that arrive via permalink count as explicit choices, so the
  // reverse geocoder does not replace them (same rule as a user rename).
  displayNameOverrides: {
    city: Boolean(startupPermalink?.city),
    country: Boolean(startupPermalink?.country),
  },
};

/* ────── Context shapes ────── */

interface PosterDispatchContextValue {
  dispatch: React.Dispatch<PosterAction>;
}

const PosterDispatchContext = createContext<PosterDispatchContextValue | null>(null);

interface PosterContextValue {
  state: PosterState;
  dispatch: React.Dispatch<PosterAction>;
  selectedTheme: ResolvedTheme;
  effectiveTheme: ResolvedTheme;
  mapStyle: StyleSpecification;
  /** The composition. See features/poster/domain/sheet.ts. */
  sheet: Sheet;
  mapRef: MapInstanceRef;
}

const PosterContext = createContext<PosterContextValue | null>(null);

/* ────── Provider ────── */

export function PosterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posterReducer, INITIAL_STATE);
  const mapRef = useRef(null) as MapInstanceRef;

  // Keep the URL hash a working permalink for the current poster, and
  // apply a permalink that arrives while the app is open.
  const handleExternalPermalink = useCallback((data: PermalinkData) => {
    dispatch({
      type: "APPLY_PERMALINK",
      fields: permalinkFormFields(data),
      customColors: permalinkCustomColors(data),
      displayNameOverrides: {
        city: Boolean(data.city),
        country: Boolean(data.country),
      },
    });
  }, []);
  usePermalinkSync(state.form, state.customColors, handleExternalPermalink);
  const lastSyncedMarkerThemeColorRef = useRef<string | null>(null);
  const lastSyncedRouteThemeColorRef = useRef<string | null>(null);
  const hasLoadedCustomIconsRef = useRef(false);

  // The map opens on the DEFAULT_FORM coordinates. Reading the visitor's
  // position here would raise a permission prompt nobody asked for, so
  // locating stays behind the "use my location" control.

  const selectedTheme = useMemo(
    () => getTheme(state.form.theme),
    [state.form.theme],
  );

  const effectiveTheme = useMemo(() => {
    if (Object.keys(state.customColors).length === 0) {
      return selectedTheme;
    }
    return applyThemeColorOverrides(selectedTheme, state.customColors);
  }, [selectedTheme, state.customColors]);

  useEffect(() => {
    const markerThemeColor = effectiveTheme.ui.text;
    const previouslySynced = lastSyncedMarkerThemeColorRef.current;

    if (previouslySynced === markerThemeColor) {
      return;
    }

    lastSyncedMarkerThemeColorRef.current = markerThemeColor;
    dispatch({
      type: "SET_MARKER_DEFAULTS",
      defaults: { color: markerThemeColor },
      applyToMarkers: true,
    });
  }, [dispatch, effectiveTheme.ui.text]);

  useEffect(() => {
    const routeThemeColor = effectiveTheme.ui.text;
    if (lastSyncedRouteThemeColorRef.current === routeThemeColor) {
      return;
    }
    lastSyncedRouteThemeColorRef.current = routeThemeColor;
    dispatch({
      type: "SET_ROUTE_DEFAULTS",
      defaults: { color: routeThemeColor },
      applyToRoutes: true,
    });
  }, [dispatch, effectiveTheme.ui.text]);

  useEffect(() => {
    let isCancelled = false;

    void loadCustomMarkerIcons()
      .then((icons) => {
        if (isCancelled) {
          return;
        }
        hasLoadedCustomIconsRef.current = true;
        dispatch({ type: "SET_CUSTOM_MARKER_ICONS", icons });
      })
      .catch(() => {
        hasLoadedCustomIconsRef.current = true;
        // Ignore storage read failures.
      });

    return () => {
      isCancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hasLoadedCustomIconsRef.current) {
      return;
    }
    void saveCustomMarkerIcons(state.customMarkerIcons).catch(() => {
      // Ignore storage write failures.
    });
  }, [state.customMarkerIcons]);

  // The plate holds the drawing rules. Its transform runs after
  // generateMapStyle, so the style generator stays close to upstream.
  const plate = useMemo<Plate>(
    () => ({
      weight: clampPlateWeight(Number(state.form.plateWeight)),
      fills: isPlateFills(state.form.plateFills)
        ? state.form.plateFills
        : DEFAULT_PLATE.fills,
      casings: Boolean(state.form.plateCasings),
    }),
    [state.form.plateWeight, state.form.plateFills, state.form.plateCasings],
  );

  // Relief is content, so it is a Layers value. Its transform runs
  // before the plate, and the plate then scales the contour lines with
  // the weight control, as it scales every other line.
  const relief = useMemo<Relief>(
    () => ({
      contours: Boolean(state.form.reliefContours),
      contourInterval: isContourInterval(state.form.reliefInterval)
        ? state.form.reliefInterval
        : DEFAULT_RELIEF.contourInterval,
      hillshade: Boolean(state.form.reliefHillshade),
      hillshadeStrength: isHillshadeStrength(state.form.reliefStrength)
        ? state.form.reliefStrength
        : DEFAULT_RELIEF.hillshadeStrength,
    }),
    [
      state.form.reliefContours,
      state.form.reliefInterval,
      state.form.reliefHillshade,
      state.form.reliefStrength,
    ],
  );

  // The sheet holds the composition. The DOM preview, the MapLibre
  // padding, the canvas compositor and the SVG exporter all read the
  // geometry that features/poster/domain/sheet.ts builds from it.
  const sheet = useMemo<Sheet>(
    () => ({
      mat: clampMat(Number(state.form.sheetMat) / 100),
      textPosition: isTextPosition(state.form.sheetText)
        ? state.form.sheetText
        : DEFAULT_SHEET.textPosition,
      mask: isSheetMask(state.form.sheetMask)
        ? state.form.sheetMask
        : DEFAULT_SHEET.mask,
    }),
    [state.form.sheetMat, state.form.sheetText, state.form.sheetMask],
  );

  const mapStyle = useMemo(
    () =>
      applyPlate(
        applyRelief(
          generateMapStyle(effectiveTheme, {
            includeLandcover: state.form.includeLandcover,
            includeBuildings: state.form.includeBuildings,
            includeWater: state.form.includeWater,
            includeParks: state.form.includeParks,
            includeAeroway: state.form.includeAeroway,
            includeRail: state.form.includeRail,
            includeRoads: state.form.includeRoads,
            includeRoadPath: state.form.includeRoadPath,
            includeRoadMinorLow: state.form.includeRoadMinorLow,
            includeRoadOutline: state.form.includeRoadOutline,
            distanceMeters: Number(state.form.distance),
          }),
          effectiveTheme,
          relief,
        ),
        effectiveTheme,
        plate,
      ),
    [
      effectiveTheme,
      plate,
      relief,
      state.form.includeLandcover,
      state.form.includeBuildings,
      state.form.includeWater,
      state.form.includeParks,
      state.form.includeAeroway,
      state.form.includeRail,
      state.form.includeRoads,
      state.form.includeRoadPath,
      state.form.includeRoadMinorLow,
      state.form.includeRoadOutline,
      state.form.distance,
    ],
  );

  const dispatchValue = useMemo<PosterDispatchContextValue>(
    () => ({ dispatch }),
    [dispatch],
  );

  const value = useMemo<PosterContextValue>(
    () => ({
      state,
      dispatch,
      selectedTheme,
      effectiveTheme,
      mapStyle,
      sheet,
      mapRef,
    }),
    [state, selectedTheme, effectiveTheme, mapStyle, sheet],
  );

  return (
    <PosterDispatchContext.Provider value={dispatchValue}>
      <PosterContext.Provider value={value}>{children}</PosterContext.Provider>
    </PosterDispatchContext.Provider>
  );
}

/* ────── Hook ────── */

export function usePosterContext(): PosterContextValue {
  const ctx = useContext(PosterContext);
  if (!ctx) {
    throw new Error("usePosterContext must be used within a PosterProvider");
  }
  return ctx;
}

export function usePosterDispatch(): PosterDispatchContextValue {
  const ctx = useContext(PosterDispatchContext);
  if (!ctx) {
    throw new Error("usePosterDispatch must be used within a PosterProvider");
  }
  return ctx;
}
