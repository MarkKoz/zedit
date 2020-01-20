'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const wait = require('gulp-wait');
const jetpack = require('fs-jetpack');
const gulpif = require('gulp-if');
const bundle = require('./bundle');
const utils = require('./utils');

const projectDir = jetpack;
const srcDir = jetpack.cwd('./src');
const jsDir = srcDir.cwd('./javascripts');
const destDir = jetpack.cwd('./app');

function bunde(removeDebug = true) {
    return function() {
        return Promise.all([
            bundle(jsDir.path('main.js'), destDir.path('main.js'), removeDebug),
            bundle(jsDir.path('app.js'), destDir.path('app.js'), removeDebug),
            bundle(jsDir.path('progress.js'), destDir.path('progress.js'), removeDebug)
        ]);
    }
}

gulp.task('bundle', bunde(true));
gulp.task('bundle-debug', bunde(false));

gulp.task('sass', function() {
    return gulp.src(srcDir.path('stylesheets/themes/*'))
        .pipe(plumber())
        .pipe(wait(250))
        .pipe(sass())
        .pipe(gulp.dest('themes'));
});

gulp.task('copySyntaxThemes', function() {
    return gulp.src('node_modules/codemirror/theme/*.css')
        .pipe(gulp.dest('syntaxThemes'));
});

gulp.task('environment', function(done) {
    let configFile = 'config/env_' + utils.getEnvName() + '.json';
    projectDir.copy(configFile, destDir.path('env.json'), { overwrite: true });
    done();
});

gulp.task('watch', function() {
    let beepOnError = function (done) {
        return function (err) {
            if (err) {
                utils.beepSound();
            }
            done(err);
        };
    };

    watch('src/**/*.js', batch(function (events, done) {
        gulp.start('bundle', beepOnError(done));
    }));
    watch('src/**/*.scss', batch(function (events, done) {
        gulp.start('sass', beepOnError(done));
    }));
});

gulp.task('build', gulp.series('bundle', 'sass', 'copySyntaxThemes', 'environment'));
gulp.task('build-debug', gulp.series('bundle-debug', 'sass', 'copySyntaxThemes', 'environment'));
