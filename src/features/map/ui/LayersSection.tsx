import MapDimensionFields from "./MapDimensionFields";
import {
  clampPlateWeight,
  isPlateFills,
  matchPlateId,
  plateOptions,
  DEFAULT_PLATE,
  MIN_PLATE_WEIGHT,
  MAX_PLATE_WEIGHT,
  PLATE_WEIGHT_STEP,
} from "@/features/map/domain/plate";

interface LayerForm {
  width: string;
  height: string;
  distance: string;
  includeLandcover: boolean;
  includeBuildings: boolean;
  includeWater: boolean;
  includeParks: boolean;
  includeAeroway: boolean;
  includeRail: boolean;
  includeRoads: boolean;
  includeRoadPath: boolean;
  includeRoadMinorLow: boolean;
  includeRoadOutline: boolean;
  plateWeight: string;
  plateFills: string;
  plateCasings: boolean;
}

interface LayersSectionProps {
  form: LayerForm;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  minPosterCm: number;
  maxPosterCm: number;
  onNumericFieldBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  onPlateChange: (plateId: string) => void;
  onPlateFillsChange: (outline: boolean) => void;
}

export default function LayersSection({
  form,
  onChange,
  minPosterCm,
  maxPosterCm,
  onNumericFieldBlur,
  onPlateChange,
  onPlateFillsChange,
}: LayersSectionProps) {
  const plateWeight = clampPlateWeight(Number(form.plateWeight));
  const plateFills = isPlateFills(form.plateFills)
    ? form.plateFills
    : DEFAULT_PLATE.fills;
  const activePlateId = matchPlateId({
    weight: plateWeight,
    fills: plateFills,
    casings: Boolean(form.plateCasings),
  });

  return (
    <section className="panel-block">
      <p className="section-summary-label">LAYERS</p>
      <label className="toggle-field">
        <span>Show landcover</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeLandcover"
            checked={Boolean(form.includeLandcover)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="toggle-field">
        <span>Show buildings</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeBuildings"
            checked={Boolean(form.includeBuildings)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="toggle-field">
        <span>Show water</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeWater"
            checked={Boolean(form.includeWater)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="toggle-field">
        <span>Show parks</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeParks"
            checked={Boolean(form.includeParks)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="toggle-field">
        <span>Show roads</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeRoads"
            checked={Boolean(form.includeRoads)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="toggle-field">
        <span>Show rail</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeRail"
            checked={Boolean(form.includeRail)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      <label className="toggle-field">
        <span>Show aeroway</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeAeroway"
            checked={Boolean(form.includeAeroway)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* The plate: how the map draws. The switches above stay the
          content of the map; the controls below change the drawing. */}
      <div className="plate-section">
        <h3 className="map-details-subtitle">Drawing</h3>
        <div className="plate-card-row">
          {plateOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`plate-card${
                activePlateId === option.id ? " plate-card--active" : ""
              }`}
              aria-pressed={activePlateId === option.id}
              onClick={() => onPlateChange(option.id)}
            >
              <span className="plate-card-name">{option.name}</span>
              <span className="plate-card-hint">{option.description}</span>
            </button>
          ))}
        </div>

        <label className="plate-weight-field">
          <span>
            <span>Line weight</span>
            <span className="plate-weight-value">
              {plateWeight.toFixed(1)}&times;
            </span>
          </span>
          <input
            className="plate-weight-slider"
            name="plateWeight"
            type="range"
            min={MIN_PLATE_WEIGHT}
            max={MAX_PLATE_WEIGHT}
            step={PLATE_WEIGHT_STEP}
            value={plateWeight}
            onChange={onChange}
            aria-label="Line weight"
          />
        </label>

        <label className="toggle-field">
          <span>Outline fills</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="plateFills"
              checked={plateFills === "outline"}
              onChange={(event) => onPlateFillsChange(event.target.checked)}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>
        <p className="plate-hint">
          Outline draws water, parks, landcover and buildings as their
          border only.
        </p>

        <label className="toggle-field">
          <span>Road casings</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="plateCasings"
              checked={Boolean(form.plateCasings)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>
      </div>

      <div className="map-details-section">
        <h3 className="map-details-subtitle">Map Details</h3>
        <div className="map-details-card">
          <MapDimensionFields
            form={form}
            minPosterCm={minPosterCm}
            maxPosterCm={maxPosterCm}
            onChange={onChange}
            onNumericFieldBlur={onNumericFieldBlur}
            showSizeFields={false}
          />
        </div>
      </div>
    </section>
  );
}
