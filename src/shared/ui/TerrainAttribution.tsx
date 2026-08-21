/**
 * The full credit for the terrain data.
 *
 * The poster carries one short line while relief is on. The whole list
 * belongs on the site, because every terrain data provider below asks
 * for its own credit. The wording follows the "Required attribution"
 * block of the Tilezen attribution document, read on 2026-08-21:
 * https://github.com/tilezen/joerd/blob/master/docs/attribution.md
 */
const TERRAIN_SOURCES: string[] = [
  "ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and funded under National Science Foundation awards 1043681, 1559691, and 1542736;",
  "Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017;",
  "Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich;",
  "Canada terrain data contains information licensed under the Open Government Licence – Canada;",
  "Europe terrain data produced using Copernicus data and information funded by the European Union – EU-DEM layers;",
  "Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration;",
  "Mexico terrain data source: INEGI, Continental relief, 2016;",
  "New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved);",
  "Norway terrain data © Kartverket;",
  "United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved;",
  "United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.",
];

export default function TerrainAttribution() {
  return (
    <section className="terrain-attribution">
      <h3 className="terrain-attribution-title">Terrain data</h3>
      <p className="terrain-attribution-intro">
        The relief uses{" "}
        <a
          className="source-link"
          href="https://github.com/tilezen/joerd"
          target="_blank"
          rel="noreferrer"
        >
          Tilezen
        </a>{" "}
        terrain tiles, hosted by Amazon Web Services. The tiles combine
        these sources:
      </p>
      <ul className="terrain-attribution-list">
        {TERRAIN_SOURCES.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </section>
  );
}
