var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gulp = require('gulp');
var ts = require('gulp-typescript');
var clean = require('gulp-clean');
var supervisor = require('supervisor');


gulp.task('clean', function() {
  return gulp.src('build', { 'read': false }).pipe(clean());
});

gulp.task('copy', function() {
  gulp.src('bower_components/**/*.{js,css}').pipe(gulp.dest('build/app/bower_components'));
  gulp.src('app/**/*').pipe(gulp.dest('build/app'));
});

gulp.task('make', function() {
  return gulp.src('lib/**/*.ts')
    .pipe(ts({
      outDir: 'build/lib'
    }))
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
  supervisor.run(["-w", "build/lib", "build/lib/server.js"]);
});

gulp.task('build', ['make', 'copy', 'browserify']);

gulp.task('default', ['serve']);
