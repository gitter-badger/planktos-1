const browserify = require('browserify');
const source = require('vinyl-source-stream');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const clean = require('gulp-clean');
const nodemon = require('gulp-nodemon');

const tsTests = ts.createProject({
  outDir: 'build/test',
  noImplicitAny: true
});

const tsLib = ts.createProject({
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

gulp.task('browserify', ['build-lib'], function() {
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

gulp.task('build-lib', function() {
  return gulp.src(['lib/**/*.ts', 'typings/index.d.ts'])
    .pipe(ts(tsLib))
    .pipe(gulp.dest('build/lib'));
});

gulp.task('build-tests', function() {
    return gulp.src(['test/**/*.ts', 'typings/index.d.ts'])
      .pipe(ts(tsTests))
      .pipe(gulp.dest('build'));
});

gulp.task('build-app', ['browserify', 'copy']);

gulp.task('build', ['build-lib', 'build-app', 'build-tests']);

gulp.task('default', ['serve']);
