import isb from "./isb";
import iima from "./iima";
import insead from "./insead";

export const schools = [isb, iima, insead];
export const schoolBySlug = (slug) => schools.find((s) => s.slug === slug);
