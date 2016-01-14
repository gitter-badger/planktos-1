var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gulp = require('gulp');
var clean = require('gulp-clean');
var supervisor = require('supervisor');


gulp.task('clean', function() {
  return gulp.src('build', { 'read': false }).pipe(clean());
});

gulp.task('copy', function() {
  gulp.src('bower_components/**/*.{js,css}').pipe(gulp.dest('build/bower_components'));
  gulp.src('app/**/*').pipe(gulp.dest('build'));
});

gulp.task('browserify', function() {
  return browserify()
  .require('./lib/client.js', { expose: 'client' })
  .bundle()
  .pipe(source('clientbundle.js'))
  .pipe(gulp.dest('./build/js'));
});

gulp.task('serve', ['build'], function() {
  gulp.watch('lib/**/*.js', ['build']);
  gulp.watch('app/**/*', ['build']);
  supervisor.run(["-w", "lib", "lib/server.js"]);
});

gulp.task('build', ['copy', 'browserify']);

gulp.task('default', ['serve']);
