/**
 * Gulp source watch tasks.
 */

'use strict';

var path = require('path'),
    gulp = require('gulp-help')(require('gulp')),
    runSequence = require('run-sequence'),
    conf = require('./conf');

/**
 * Gulp source watch task.
 * Clean js tmp -> run tslint, jshint -> temporary watch scripts -> run watch scripts, watch build scripts in parallel.
 * @param done - done callback function.
 */
gulp.task('watch', function (done) {
    runSequence('clean-js-tmp', ['jshint', 'tslint'], 'tmp-watch-scripts', ['watch-scripts', 'watch-build-scripts'], done);
});

/**
 * Gulp watch scripts.
 * Watch source script changes -> run tslint -> watch .tmp source changes.
 */
gulp.task('watch-scripts', function(){
    gulp.watch([
      path.join(conf.paths.test, conf.path_pattern.ts),
      path.join(conf.paths.src, conf.path_pattern.ts)
    ], function() {
        runSequence('tslint','tmp-watch-scripts');
    });
});

/**
 * Gulp watch build scripts.
 * Watch changes in build process helper files -> run jshint.
 */
gulp.task('watch-build-scripts', function(){
  gulp.watch([
    path.join(conf.paths.gulp, conf.path_pattern.js), conf.paths.gulpFile, conf.paths.karmaConf, conf.paths.karmaCoverageConf   ], function() {
    gulp.start('jshint');
  });
});







