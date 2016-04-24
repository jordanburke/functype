import {option, some, none, Option, Some, None} from './main/Option';

/**
 * Export to public as typescript modules.
 */
export {
  option, some, none, Option, Some, None
};

/**
 * Export to public by binding them to the window property.
 */
window['App'] = {
  option: option
};

