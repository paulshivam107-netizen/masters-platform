import iima from "./iima";
import iimb from "./iimb";
import iimk from "./iimk";
import iiml from "./iiml";
import iimMumbai from "./iim-mumbai";
import iimc from "./iimc";
import iimIndore from "./iim-indore";
import iimRaipur from "./iim-raipur";
import iimTrichy from "./iim-trichy";
import iimRanchi from "./iim-ranchi";
import iimRohtak from "./iim-rohtak";
import iimUdaipur from "./iim-udaipur";
import iimKashipur from "./iim-kashipur";
import iimNagpur from "./iim-nagpur";
import iimVisakhapatnam from "./iim-visakhapatnam";
import isb from "./isb";
import fmsDelhi from "./fms-delhi";
import mdi from "./mdi";
import xlri from "./xlri";
import sibmPune from "./sibm-pune";
import spjimr from "./spjimr";
import nmimsMumbai from "./nmims-mumbai";
import hbs from "./hbs";
import stanfordGsb from "./stanford-gsb";
import wharton from "./wharton";
import chicagoBooth from "./chicago-booth";
import kellogg from "./kellogg";
import columbia from "./columbia";
import mitSloan from "./mit-sloan";
import tuck from "./tuck";
import berkeleyHaas from "./berkeley-haas";
import yaleSom from "./yale-som";
import dukeFuqua from "./duke-fuqua";
import uvaDarden from "./uva-darden";
import nyuStern from "./nyu-stern";
import cornellJohnson from "./cornell-johnson";
import insead from "./insead";

// Order sets the region order on /schools: India, United States, Europe.
// India: IIMs in NIRF 2025 Management order, then ISB and FMS, then the top private schools by NIRF.
export const india = [
  iima,
  iimb,
  iimk,
  iiml,
  iimMumbai,
  iimc,
  iimIndore,
  iimRaipur,
  iimTrichy,
  iimRanchi,
  iimRohtak,
  iimUdaipur,
  iimKashipur,
  iimNagpur,
  iimVisakhapatnam,
  isb,
  fmsDelhi,
  mdi,
  xlri,
  sibmPune,
  spjimr,
  nmimsMumbai,
];
export const unitedStates = [
  hbs, stanfordGsb, wharton, chicagoBooth, kellogg, columbia, mitSloan, tuck, berkeleyHaas, yaleSom, dukeFuqua, uvaDarden, nyuStern, cornellJohnson,
];
export const schools = [...india, ...unitedStates, insead];
export const TRACK_LABELS = {
  "two-year": "Two-year MBA",
  executive: "Executive and one-year MBA",
};

// Groups for the school list: India split by programme track, other regions by school.
export const schoolGroups = () => [
  ...Object.entries(TRACK_LABELS).map(([track, label]) => ({
    id: `india-${track}`,
    heading: `India · ${label}`,
    items: india
      .map((school) => ({ school, programmes: school.programmes.filter((p) => p.track === track) }))
      .filter((item) => item.programmes.length),
  })),
  ...["United States", "Europe"].map((region) => ({
    id: region.toLowerCase().replace(/ /g, "-"),
    heading: region,
    items: schools.filter((s) => s.region === region).map((school) => ({ school, programmes: school.programmes })),
  })),
];
export const schoolBySlug = (slug) => schools.find((s) => s.slug === slug);
