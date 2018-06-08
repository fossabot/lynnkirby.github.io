#!/usr/bin/env node

// Gulp doesn't register the necessary extensions with Babel
// so we do it ourselves with this little wrapper.

require("@babel/register")({
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});

require("gulp-cli")();
