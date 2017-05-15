var _ = require("lodash");
var async=require("async");

module.exports=function(module){

  var apos = module.apos;


  function isArea(value) {
    return !((!value) || (value.type !== 'area'));
  }

  function isUniversal(doc, key) {

    if(!module.options.universal){
      return false;
    }

    if (module.options.universal.indexOf(key) >=0 || module.options.universal.indexOf( doc.type + ':' + key) >= 0) {
      return true;
    }

  }

  function localizedKeyForDoc(doc,name){

    var matches = name.match(/([\w-]+):(\w+)/);

    if (matches) {
      if (doc.type !== matches[1]) {
        return;
      }
      name = matches[2];
    }
    if (!_.has(doc, name)) {
      return;
    }


    return name;

  }


  function isNeverType(doc){

    if(!doc.type){
      return false;
    }


    if(!module.neverTypes){
      return false;
    }


    return module.neverTypes.indexOf(doc.type) >=0;

  }


  function setup(doc,locales,callback){


    var collection;
    var docs = {};
    var type =doc.type+"_localized";

    async.series({

      docs:function(callback){
        collection = apos.db.collection("aposLocalizedDocs",function(err,col){
          if(err){
            return callback(err);
          }

          collection = col;
          return callback();

        });
      },
      createLocales:function(callback){
        async.each(Object.keys(locales),function(locale,callback){

          collection.findOneAndUpdate(
            {"type":type,"docId":doc._id,"locale":locale},
            {
              $setOnInsert:{
                "docId":doc._id,
                "locale":locale,
                "type":type
              }
            },
            {
              upsert:true,
              returnOriginal: false
            },
            function(err,doc){

              if(err){
                return callback(err);
              }

              docs[locale]=doc.value;
              return callback()
            })
        },callback);

      }
    },function(err){

      if(err){
        return callback(err);
      }

      return callback(null,{
          "collection":collection,
          "docs":docs,
          "type":type
        }
      );

    });

  }

  function syncLocale(doc,locale,callback){

    if(isNeverType(doc)){

      console.log("Doc type ",doc.type, " is in neverTypes");
      return callback();

    }

    
    debugDocument(doc,"Before sync locale",function(doc){
      return doc.slug == "/tips"
    });




    var localized= {};


    async.series({

      setup:function(callback){

        setup(doc,module.locales,function(err,setup){
          if(err){
            return callback(err);
          }

          localized = setup;
          return callback()
        });
      },
      populateFields:function(callback){

        _.each(doc, function(value, key) {


          if (!isArea(value)) {
            return;
          }

          if (isUniversal(doc, key)) {
            return;
          }


          localized.docs[locale][key] = apos.utils.clonePermanent(value);

          // Revert .body to the default culture's body, unless
          // that doesn't exist yet, in which case we let it spawn from
          // the current culture
          if (_.has(localized.docs[module.defaultLocale], key)) {
            doc[key] = localized.docs[module.defaultLocale][key];
          } else {
            localized.docs[module.defaultLocale][key]=apos.utils.clonePermanent(doc[key]);
          }

        });


        _.each(module.localized,function(name){
          name = localizedKeyForDoc(doc,name);

          if(!name){
            return;
          }

          if(isArea(doc[name])){
            return;
          }

          localized.docs[locale][name]=doc[name];

          if (_.has(localized.docs[module.defaultLocale], name)) {
            doc[name] = localized.docs[module.defaultLocale][name];
          } else {
            localized.docs[module.defaultLocale][name] = doc[name];
          }

        });



        debugDocument(doc,"  After Populate  ", function(doc){
          return doc.slug == "/tips"
        });

        callback();

      },
      saveDos:function(callback){

        async.each([module.defaultLocale,locale],function(locale,callback){
          return localized.collection.update({_id:localized.docs[locale]._id},localized.docs[locale],callback);
        },callback)

      }
    },callback);

  }


  function debugDocument(doc,title,matcher){


    if(matcher(doc)){
    console.log("\n\n***************** ", title ,"***************** \n\n");


      console.log("Id: ",doc._id);
      _.each(doc,function(value,key){
        console.log("\tKey: ",key);
        console.log("\tValue",JSON.stringify(value,null,2));
        console.log("");
        console.log("");
        console.log("");

      });
    console.log("************************************************************* \n\n");
    }

  }
  return {

    syncLocale:syncLocale,
    loadLocale:function(results,locale,callback){

      if(module.disableLoad){
        return callback();
      }



      _.each(results,function(doc,callback){

        debugDocument(doc, " Loading Locale ", function(doc){
          return doc.slug == "/tips"
        })
      });

      async.each(results,function(doc,callback){

        if(isNeverType(doc)){

          console.log("Doc type ",doc.type, " is in neverTypes");
          return callback();

        }

        return setup(doc,module.locales,function(err,localized){

          if(err){
            console.log('Error ',err,'calling callback');
            return callback(err);
          }

          var log = false;

          if(log) console.log("Working with ",
            locale,
            "\n****\n",
            doc,
            "\n****\n",
            localized.docs,
            "\n****\n"

            );

          _.each(doc, function (value, key) {



            if (!isArea(value)) {
              return;
            }

            if (isUniversal(doc, key)) {
              return;
            }

            // for bc with sites that didn't have this module until
            // this moment, if the default locale has no content,
            // populate it from the live property


            if(log) console.log("\tLocalizing \n\t\t",locale,doc.slug, doc._id, key, value);


            if (!_.has(localized.docs[module.defaultLocale], key)) {
              localized.docs[module.defaultLocale][key] = doc[key];
            }


            if (!_.has(localized.docs[locale], key)) {
              if(log) console.log("\treturning because ",locale," is not available for ",key, localized.docs[locale]);
              return;
            }


            // do a shallow clone so the slug property can differ
            // we have to be careful with the dot path
            doc[key] = _.clone(localized.docs[locale][key]);
            doc[key]["_dotPath"] = key; // this seems to be causing the issue in the frontend



            var superKey = key;
            if(value.type === "area" && value.items && value.items.length > 0 ){
              _.each(value.items[0],function(value,key){
                if(key.indexOf("_") === 0 && key !== "_id" && key !== "_dotPath"){
                  if(log) console.log("\t\t\tAdding ",key," --- ", superKey, " -> ",doc[superKey]);
                  doc[superKey].items[0][key]=value;

                }
              });
            }

            // doc[key] =localized.docs[locale][key];
            // doc[key]["_dotPath"] = key; // this seems to be causing the issue in the frontend

          });

          _.each(module.localized, function (name) {


            name = localizedKeyForDoc(doc, name);

            if (!name) {
              return;
            }


            // for bc with sites that didn't have this module until
            // this moment, if the default locale has no content,
            // populate it from the live property
            if (!_.has(localized.docs[module.defaultLocale], name)) {
              localized.docs[module.defaultLocale][name] = doc[name];
            }

            if (!_.has(localized.docs[locale], name)) {
              return;
            }

            doc[name] = localized.docs[locale][name];


          });



          if(doc.slug == "/tips"){


            console.log("Localized Id: ",doc._id);
            _.each(doc,function(value,key){
              console.log("\tKey: ",key);
              console.log("\tValue",JSON.stringify(value,null,2));
              console.log("");
              console.log("");
              console.log("");

            });
          }

          return callback();

        });

      },callback);

    },
    migrateLocale:function(doc,callback){


      if(!doc.localized){
        console.log("No localized in ",doc._id,doc.type);
        return callback();
      }

      var _locales = Object.keys(doc.localized);

      async.each(_locales,function(locale,callback){

        if(!doc.localized[locale]){return callback()}

        var localized  = {};

        async.series({
          setup:function(callback){
            setup(doc,module.locales,function(err,setup){

              if(err){return callback(err)}
              localized=setup;
              return callback();
            });
          },
          clone:function(callback){
            _.each(doc.localized[locale], function(value, key) {


              if(isUniversal(doc,key)){
                console.log("Key: ", key, " is universal not adding ");
                return;
              }

              localized.docs[locale][key] = value;
              //remove never times

            });

            return callback();
          },
          save:function(callback){
            return localized.collection.update({_id:localized.docs[locale]._id},localized.docs[locale],callback);
          }
        },callback);
      },function(err){

        if(err){
          return callback(err);
        }

        delete doc.localized;
        delete doc.localizedAt;
        delete doc.localizedStale;
        delete doc.localizedSeen;

        return callback();

      });

    }
  }




};