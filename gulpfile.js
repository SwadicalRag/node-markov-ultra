var gulp = require("gulp");

var path = require("path")

var source = require("vinyl-source-stream");

var browserify = require("browserify");
var watchify = require("watchify");
var tsify = require("tsify");

var ts = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");

var notify = require("gulp-notify");
var gutil = require("gulp-util");

var merge = require("merge2");

var config = {
    apps: [
        {
            sourceMapLocation: path.join(__dirname,"/maps/"),
            definesLocation: path.join(__dirname,"/definitions/"),
            dest: path.join(__dirname,"/js/"),
            base: path.join(__dirname,"/"),
            source: path.join(__dirname,"/src/"),
            browserify: false
        }
    ]
};

var tasks = [];

function register(i,app) {
    var id = app.id || "task-" + i;
    if(app.browserify) {
        tasks[tasks.length] = id;
        
        gulp.task(id,function() {
            // gutil.log("Running sub-task " + id);

            var bundler = browserify({
                cache: {},
                packageCache: {},
                basedir: app.path
            }).add(path.join(app.path,"/" + app.main))
                .plugin(tsify)
                .on("time",function(time) {
                    // gutil.log("Finished rebuilding after " + time/1000 + " s")
                });

            function build(rebuild) {
                var bundle = bundler.bundle();

                return bundle
                .pipe(source(app.result))
                .pipe(gulp.dest(app.dest))
            }

            return build(false);
        });
    }
    else {
        tasks[tasks.length] = id;

        var project = ts.createProject(path.join(app.base,"tsconfig.json"),{
            declaration: true,
            sourceMap: true
        });

        gulp.task(id,function() {
            // gutil.log("Running sub-task " + id);

            var tsResult = project.src().pipe(sourcemaps.init()).pipe(ts(project));

            return merge([
                tsResult.js.pipe(sourcemaps.write(path.relative(app.source,app.sourceMapLocation),{
                    sourceRoot: (filepath) => {
                        return path.relative(path.dirname(filepath.path),app.source)
                    }
                })).pipe(gulp.dest(app.dest)),
                tsResult.dts.pipe(gulp.dest(app.definesLocation))
            ]);
        });
    }
}

for(var i=0;i < config.apps.length;i++) {
    register(i,config.apps[i]);
}

gulp.task("watch",tasks,function() {
    gulp.watch([
        "**/*.ts",
        "**/*.tsx",
        "!**/*.d.ts"
    ],tasks);
});
