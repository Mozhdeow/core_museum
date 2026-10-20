/** Optional UUID-specific display calibration, in radians. Originals and CMS remain untouched.
 * Add an entry only after inspecting that asset. scale is a bounded fraction of its safe fit. */
export type ExhibitPresentation={rotation?:readonly [number,number,number];scale?:number;autoOrient?:boolean}
export const exhibitPresentations:Readonly<Record<string,ExhibitPresentation>>={}
