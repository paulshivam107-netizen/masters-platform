import isb from "./isb";
import iima from "./iima";
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
export const india = [isb, iima];
export const unitedStates = [
  hbs, stanfordGsb, wharton, chicagoBooth, kellogg, columbia, mitSloan, tuck, berkeleyHaas, yaleSom, dukeFuqua, uvaDarden, nyuStern, cornellJohnson,
];
export const schools = [...india, ...unitedStates, insead];
export const schoolBySlug = (slug) => schools.find((s) => s.slug === slug);
