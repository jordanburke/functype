import Greeter from './main/Greeter';
import {option, some, none, Option, Some, None} from './main/Option';

/**
 * Export Greeter to public as typescript modules.
 */
export {
    Greeter
};

/**
 * Export Greeter to public by binding them to the window property.
 */
window['App'] = {
    'Greeter':Greeter,
    option: option
};

console.log(option(10));

