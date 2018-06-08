import path from "path";
import fs from "fs";
import process from "process";
import gulp from "gulp";
import originalGulplog from "gulplog";
import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackFormatMessages from "webpack-format-messages";
import getLogger from "webpack-log";

// ===========================================================================
// Set up overall stuff.

const NODE_ENV = process.env.NODE_ENV === "production" ?
  "production" : "development";

// ===========================================================================
// Set up logging.

const gulplog = getLogger({ name: "gulp" });
const weblog = getLogger({ name: "webpack" });
const expresslog = getLogger({ name: "express" });

// Reroute gulp logging to use webpack-log (because why not?).
originalGulplog.removeAllListeners("debug");
originalGulplog.removeAllListeners("info");
originalGulplog.removeAllListeners("warn");
originalGulplog.removeAllListeners("error");
originalGulplog.on("debug", msg => gulplog.debug(msg));
originalGulplog.on("info", msg => gulplog.info(msg));
originalGulplog.on("warn", msg => gulplog.warn(msg));
originalGulplog.on("error", msg => gulplog.error(msg));

// ===========================================================================
// Scaffolding for defining site builders.

interface Middleware {
  handler: express.RequestHandler;
  closeHandler?: () => void;
}

interface Builder {
  name: string; // eslint-disable-line
  task: gulp.TaskFunction;
  middleware: () => Middleware;
}

const builders: Builder[] = [];

// ===========================================================================
// Static file builder.

builders.push({
  name: "public",

  task: () => {
    return gulp
      .src("./public/**/*", { dot: true })
      .pipe(gulp.dest("./dist"));
  },

  middleware: () => ({
    handler: express.static("./public"),
  }),
});

// ===========================================================================
// Client-side builder using Webpack.

const webpackConfig: webpack.Configuration = {
  entry: "./client/index.ts",

  mode: NODE_ENV,

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },

  module: { rules: [] },
};

webpackConfig.module.rules.push({
  test: /\.(jsx?|tsx?)$/,
  exclude: /(node_modules)/,
  use: {
    loader: "babel-loader",
  },
});

builders.push({
  name: "client",

  task: () => new Promise<{}>((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err) return reject(err);

      const messages = webpackFormatMessages(stats);

      if (messages.errors.length > 0) {
        messages.errors.forEach(x => weblog.error(x));
        return reject(new Error("Compile failed."));
      }

      if (messages.warnings.length > 0) {
        messages.warnings.forEach(x => weblog.warn(x));
        weblog.info("Compiled with warnings.");
      }

      return resolve();
    });
  }),

  middleware: () => {
    const compiler = webpack(webpackConfig);
    const wds = webpackDevMiddleware(compiler);

    return {
      handler: wds,
      closeHandler: () => wds.close(),
    };
  },
});

// ===========================================================================
// Markdown post builder.

// ===========================================================================
// Build tasks.

// Make a task for each builder.
builders.forEach(builder => {
  gulp.task(`build:${builder.name}`, builder.task);
});

// Overall build task that combines all the builders.
gulp.task("build", gulp.parallel(builders.map(x => `build:${x.name}`)));

// ===========================================================================
// Dev server task.

gulp.task("start", () => (
  new Promise((resolve) => {
    const app = express();
    const middleware = builders.map(x => x.middleware());
    app.use(middleware.map(x => x.handler));

    const http = app.listen(3000, () => {
      expresslog.info("Server listening on http://localhost:3000");
    });

    process.on("SIGINT", () => {
      expresslog.info("Terminating server...");

      middleware.forEach(x => {
        if (x.closeHandler) x.closeHandler();
      });

      http.close(() => resolve());
    });
  })
));

// ===========================================================================
// Serve production files task.

gulp.task("serve:prebuilt", () => (
  new Promise((resolve) => {
    const app = express();
    app.use(express.static("./dist"));

    // Assume we've rendered a 404.html file and serve it as needed.
    const notFound = fs.readFileSync("./dist/404.html");

    app.use((_req, res) => {
      res.status(404)
        .set("Content-Type", "text/html")
        .send(notFound);
    });

    const http = app.listen(3000, () => {
      expresslog.info("Server listening on http://localhost:3000");
    });

    process.on("SIGINT", () => {
      expresslog.info("Terminating server...");
      http.close(() => resolve());
    });
  })
));

gulp.task("serve", gulp.series(["build", "serve:prebuilt"]));
