import { describe, expect, it } from "vitest";
import { distanceBetweenMeters } from "@/lib/utils";
import {
  DEMO_ORIGIN,
  SCENARIOS,
  destination,
  distanceLabel,
  project,
} from "./scenarios";

describe("territory example coordinates", () => {
  it("places the golf club exactly one kilometre from the visitor", () => {
    const club = destination(DEMO_ORIGIN, 1000, 65);
    expect(distanceBetweenMeters(DEMO_ORIGIN, club)).toBeCloseTo(1000, 5);
    expect(distanceLabel(DEMO_ORIGIN, club)).toMatch(/1\s?000 м/);
    const visitor = destination(DEMO_ORIGIN, 750, 65);
    expect(distanceBetweenMeters(visitor, club)).toBeCloseTo(250, 5);
  });
  it("uses the correct cardinal directions and keeps every selectable point on the plan", () => {
    expect(destination(DEMO_ORIGIN, 500, 0).lat).toBeGreaterThan(
      DEMO_ORIGIN.lat,
    );
    expect(destination(DEMO_ORIGIN, 500, 90).lng).toBeGreaterThan(
      DEMO_ORIGIN.lng,
    );
    for (const scenario of SCENARIOS)
      for (const place of scenario.places) {
        const xy = project(
          destination(DEMO_ORIGIN, place.distance, place.bearing),
        );
        expect(xy.x).toBeGreaterThan(60);
        expect(xy.x).toBeLessThan(930);
        expect(xy.y).toBeGreaterThan(65);
        expect(xy.y).toBeLessThan(480);
      }
  });
});
