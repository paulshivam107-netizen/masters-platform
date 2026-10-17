import isb from "./isb";
import iima from "./iima";
import iimb from "./iimb";
import iimk from "./iimk";
import iitDelhiDms from "./iit-delhi-dms";
import iiml from "./iiml";
import iimMumbai from "./iim-mumbai";
import iimc from "./iimc";
import iimIndore from "./iim-indore";
import mdi from "./mdi";
import xlri from "./xlri";
import sibmPune from "./sibm-pune";
import iitKharagpurVgsom from "./iit-kharagpur-vgsom";
import iitMadrasDoms from "./iit-madras-doms";
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
// India after ISB follows the NIRF 2025 Management ranking.
export const india = [
  isb,
  iima,
  iimb,
  iimk,
  iitDelhiDms,
  iiml,
  iimMumbai,
  iimc,
  iimIndore,
  mdi,
  xlri,
  sibmPune,
  iitKharagpurVgsom,
  iitMadrasDoms,
];
export const unitedStates = [
  hbs, stanfordGsb, wharton, chicagoBooth, kellogg, columbia, mitSloan, tuck, berkeleyHaas, yaleSom, dukeFuqua, uvaDarden, nyuStern, cornellJohnson,
];
export const schools = [...india, ...unitedStates, insead];
export const schoolBySlug = (slug) => schools.find((s) => s.slug === slug);
