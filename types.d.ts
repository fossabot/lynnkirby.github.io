// Misc. type declaration.

// ESLint doesn't like these multiple default exports. ¯\_(ツ)_/¯
/* eslint import/export: "off" */

declare module "gulplog" {
  import { EventEmitter } from "events";

  class Log extends EventEmitter {
    debug(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
  }

  declare const log: Log;
  export default log;
}

declare module "webpack-format-messages" {
  import webpack from "webpack";

  export default function(stats: webpack.Stats): {
    errors: string[];
    warnings: string[];
  };
}

declare module "webpack-log" {
  export default function(opts: { name: string }): {
    trace(message?: any, ...optionalParams: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
  };
}
