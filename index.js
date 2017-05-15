var _ = require('lodash');
var async = require('async');
var util = require("util");
var localized = require("./lib/localized");


module.exports = {
  improve: 'apostrophe-docs',
  alias:'existanzeDocs',
  afterConstruct:function(self){
    self.apos.app.use(self.localizedHelper);
    self.apos.app.use(self.localizedGet);

  },
  construct:function(self,options){



    var l = localized(self);

    self.defaultLocale = options.default || "en";
    self.locales = options.locales;
    self.localized = [ 'title' ].concat(options.localized || []);

    self.neverTypes =options.neverTypes || ['apostrophe-image'];

    self.disableLoad = options.disableLoad || false;
    self.disableSave = options.disableSave || false;




    self.localizedHelper=function(req, res, next) {
      self.addHelpers({

        localePicker:function(args){


          var locales = [];
          var availableLanguages = _.keys(locales);

          var urls = require('url');
          var parsed = urls.parse(req.url, true);
          delete parsed.search;
          delete parsed.query.apos_refresh;
          var currentUrl = urls.format(parsed);



          if (args && args.localized && args._edit == undefined) {
            availableLanguages = _.keys(args.localized);
          }

          _.each(options.locales, function (value, key) {


            var newUrl = '/' + key + currentUrl;

            /**
             * We don't want to include a locale
             * slug for defaultLocale
             */
            if(key == self.defaultLocale){
              newUrl = currentUrl;
            }

            var localeObject = {
              key: key,
              value: value,
              url: newUrl,
              translated: (_.indexOf(availableLanguages, key) >=0) ,
              active: (req.locale === key)
            };

            locales.push(localeObject);

          });

          return self.partial('localePicker', {locales: locales, args: args});

        },
        toLocalUrl:function(url){


          /**
           * We don't want to include a locale
           * slug for defaultLocale
           */
          if(req.locale == self.defaultLocale){
            return url;
          }

          return "/"+ req.locale+ url;

        }
      });

      return next();

    };

    self.localizedGet=function(req, res, next) {

      if (req.method !== 'GET') {
        return next();
      }

      function setLocale(req,locale){

        var set = locale;
        req.locale = set;
        req.session.locale = set;
        req.data.activeLocale = set;
        self.apos.i18n.setLocale(req,set);



      }

      var matches = req.url.match(/^\/(\w+)(\/.*|\?.*|)$/);
      if (!matches) {
        //do not keep the session locale here
        setLocale(req,self.defaultLocale);
        return next();
      }

      if (!_.has(options.locales, matches[1])) {
        setLocale(req,self.defaultLocale);
        return next();
      }

      setLocale(req,matches[1]);

      req.url = matches[2];

      if (!req.url.length) {
        req.url = "/"
      }

      return next();

    };

    self.docBeforeSave = function(req, doc, options,callback) {

      /**
       * For future reference.
       *
       *
       * This is called on a POST which means that the URL does not
       * contain a locale prefix which in turn means that req.locale will
       * not be set through the logic in the localizedGet middleware.
       *
       * This means that we need to store the locale in the session
       * so that we have it available here
       */
      var locale =req.locale;

      if(req.session && req.session.locale){
        locale = req.session.locale;
      }


      if(!locale){
        return setImmediate(callback);
      }

      l.syncLocale(doc,locale,callback);

    };



    /**
     * Go over all schemas and set the _localized value so that
     * we can augment the apostrophe-schema:macros in order
     * to display a localization icon
     *
     */
    _.each(self.apos.modules,function(module){

      var moduleName =

        module.options.alias ?
          module.options.alias : module.__meta.name;


      if(module.schema){
        _.each(module.schema,function(field){

          if(
            field.type == "area" ||
            self.localized.indexOf(field.name) >= 0 ||
            self.localized.indexOf(moduleName+":"+field.name) >=0 ){
            field._localized = true;

          }
        })
      }

    });



    // merge new methods with all apostrophe-cursors
    self.apos.define('apostrophe-cursor', require('./lib/cursor.js')(self,l));

    self.apos.tasks.add("localized","migrate","This is a task that migration from doc.localized to proper collections in the database",function(apos,arg,callback){


      var cursor = apos.db.collection("aposDocs").find().sort({"type":1,"_id":1});

      var stop = false;

      async.doUntil(function(callback){

        cursor.nextObject(function (err, doc) {

          if(err || !doc){
            stop = true;
            return callback(err);
          }


          if(!doc.localized){
            console.log("Skipping ",doc._id,doc.type );
            return callback();
          }


          if(options.neverTypes && options.neverTypes.indexOf(doc.type) >= 0){

            console.log("\tNever type, removing localized",options.neverTypes.indexOf(doc.type));
            delete doc.localized;
            delete doc.localizedAt;
            delete doc.localizedStale;
            delete doc.localizedSeen;
            return apos.db.collection("aposDocs").update({_id:doc._id},doc,callback);


          }

          console.log("Migrating ",doc.type,doc._id,doc.title);
          l.migrateLocale(doc,function(err){

            if(err){
              console.error(err);
              return callback(err)
            }

            return apos.db.collection("aposDocs").update({_id:doc._id},doc,callback);

          });


        });
      }
      ,function () { return stop }
      ,callback);
    });
    self.apos.tasks.add("localized","correctClone","Remove the _ properties from the documents ",function(apos,arg,callback){


      var cursor = apos.db.collection("aposLocalizedDocs").find().sort({"type":1,"_id":1});
      var stop = false;

      async.doUntil(function(callback){

        cursor.nextObject(function (err, doc) {

          if(err || !doc){
            stop = true;
            return callback(err);
          }

          var d = apos.utils.clonePermanent(doc);
          d._id = doc._id;

          return apos.db.collection("aposLocalizedDocs").update({_id:doc._id},d,callback);

        });
      }
      ,function () { return stop }
      ,callback);
    });


  }


};