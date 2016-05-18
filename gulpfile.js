var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gulp = require('gulp');
var ts = require('gulp-typescript');
var clean = require('gulp-clean');
var nodemon = require('gulp-nodemon');

var tsProject = ts.createProject({
  outDir: 'build/lib',
  noImplicitAny: true
});


gulp.task('clean', function() {
  return gulp.src('build', { 'read': false }).pipe(clean());
});

gulp.task('copy', function() {
  gulp.src('bower_components/**/*.{js,css}').pipe(gulp.dest('build/app/bower_components'));
  gulp.src('app/**/*').pipe(gulp.dest('build/app'));
});

gulp.task('make', function() {
  return gulp.src(['lib/**/*.ts', 'typings/index.d.ts'])
    .pipe(ts(tsProject))
    .pipe(gulp.dest('build/lib'));
});

gulp.task('browserify', ['make'], function() {
  return browserify()
  .require('./build/lib/client.js', { expose: 'client' })
  .bundle()
  .pipe(source('clientbundle.js'))
  .pipe(gulp.dest('./build/app/js'));
});

gulp.task('serve', ['build'], function() {
  gulp.watch('lib/**/*.ts', ['build']);
  gulp.watch('app/**/*', ['build']);
  nodemon({ script: 'build/lib/server.js', watch: 'build/lib' });
});

gulp.task('build', ['make', 'copy', 'browserify']);

gulp.task('default', ['serve']);
