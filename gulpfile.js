const browserify = require('browserify');
const source = require('vinyl-source-stream');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const clean = require('gulp-clean');
const nodemon = require('gulp-nodemon');

const tsProj = ts.createProject({
  outDir: 'build',
  noImplicitAny: true
});

gulp.task('clean', function() {
  return gulp.src('build', { 'read': false }).pipe(clean());
});

gulp.task('copy', function() {
  gulp.src('bower_components/**/*.{js,css}').pipe(gulp.dest('build/app/bower_components'));
  gulp.src('app/**/*').pipe(gulp.dest('build/app'));
});

gulp.task('browserify', ['tsc'], function() {
  return browserify()
  .require('./build/lib/client.js', { expose: 'client' })
  .bundle()
  .pipe(source('clientbundle.js'))
  .pipe(gulp.dest('./build/app/js'));
});

gulp.task('serve', ['build'], function() {
  gulp.watch('lib/**/*.ts', ['build']);
  gulp.watch('app/**/*', ['build']);
  gulp.watch('server/**/*', ['build']);
  nodemon({ script: 'build/server', watch: ['build/lib', 'build/server'] });
});

gulp.task('tsc', function() {
  return gulp.src(['test/**/*.ts', 'server/**/*.ts', 'lib/**/*.ts', 'typings/index.d.ts'])
    .pipe(ts(tsProj))
    .pipe(gulp.dest('build'));
});

gulp.task('build', ['tsc', 'browserify', 'copy']);

gulp.task('default', ['serve']);
