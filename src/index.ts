import * as opt from './main/Option';
import * as list from './main/List';
import * as map from './main/Map';

/**
 * Export to public as typescript modules.
 */
export {
  opt, list, map
};

/**
 * Export to public by binding them to the window property.
 */
window['App'] = {
  opt: opt,
  list: list,
  map: map
};

