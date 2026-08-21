import { useCallback, useRef } from "react";
import { ensureFont } from "@/core/services";
import type { PosterForm } from "@/features/poster/application/posterReducer";
import type { FontOption } from "@/core/config";
import {
  PLACEHOLDER_EXAMPLE_CITY,
  PLACEHOLDER_EXAMPLE_COUNTRY,
} from "@/features/location/ui/constants";

interface TypographySectionProps {
  form: PosterForm;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  fontOptions: FontOption[];
}


export default function TypographySection({
  form,
  onChange,
  fontOptions,
}: TypographySectionProps) {
  const previewsRequested = useRef(false);

  // Each <option> previews itself in its own typeface, which means every family
  // has to be loaded for the dropdown to look right. That is a lot of bytes for
  // the many users who never change the font, so hold off until they actually
  // reach for the control rather than paying it on mount.
  const preloadFontPreviews = useCallback(() => {
    if (previewsRequested.current) return;
    previewsRequested.current = true;

    const families = fontOptions
      .map((option) => String(option.value || "").trim())
      .filter(Boolean);

    void Promise.allSettled(families.map((family) => ensureFont(family)));
  }, [fontOptions]);

  return (
    <>
      <section className="panel-block">
        <p className="section-summary-label">STYLE</p>
        {/* The poster text has ONE control, and it lives in the
            Layout section under "Composition". It decides the position
            of the text block, and "None" removes it. A second switch
            here would hide the text but keep its reserved band, which
            is a state nobody asks for. */}
        <label className="toggle-field">
          <span>Overlay layer</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="showMarkers"
              checked={Boolean(form.showMarkers)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>
        {/* One switch hides both credit lines: the OpenStreetMap line and
            the site line. The footer keeps the attribution for the site.
            A poster that a user publishes is the user's produced work;
            the hint passes that duty on in the words of the guidelines. */}
        <label className="toggle-field">
          <span>Poster credits</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="includeCredits"
              checked={Boolean(form.includeCredits)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>
        {!form.includeCredits ? (
          <p className="credits-hint">
            The credits stay in the footer. If you publish the poster, add
            &ldquo;&copy; OpenStreetMap contributors&rdquo; next to it
            {form.reliefContours || form.reliefHillshade
              ? ", and the terrain credit for the relief"
              : ""}
            .
          </p>
        ) : null}

        <div className="field-grid keep-two-mobile">
          <label>
            Display city
            <input
              className="form-control-tall"
              name="displayCity"
              value={form.displayCity}
              onChange={onChange}
              placeholder={PLACEHOLDER_EXAMPLE_CITY}
            />
          </label>
          <label>
            Display country
            <input
              className="form-control-tall"
              name="displayCountry"
              value={form.displayCountry}
              onChange={onChange}
              placeholder={PLACEHOLDER_EXAMPLE_COUNTRY}
            />
          </label>
        </div>
        <label>
          Font
          <select
            className="form-control-tall"
            name="fontFamily"
            value={form.fontFamily}
            onChange={onChange}
            onFocus={preloadFontPreviews}
            onMouseDown={preloadFontPreviews}
            onTouchStart={preloadFontPreviews}
          >
            {fontOptions.map((fontOption) => (
              <option
                key={fontOption.value || "default"}
                value={fontOption.value}
                style={{
                  fontFamily: fontOption.value
                    ? `"${fontOption.value}", "Space Grotesk", sans-serif`
                    : `"Space Grotesk", sans-serif`,
                }}
              >
                {fontOption.label}
              </option>
            ))}
          </select>
        </label>

      </section>
    </>
  );
}
