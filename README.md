# existanze-docs-localized

This is a port of the [0.5 Apostrophe Localization](https://github.com/punkave/apostrophe-localization) module, 
for the [Apostrophe 2.0](http://apostrophecms.org/) nodejs/express based CMS.

If something is not documented here look at the originals' module README regarding options / configuration, 
since we are trying to stick as close to that as possible, whilst in the meantime adding a few bits here and there. 

**This is not a production ready module** so please use carefully, and let us know of any issues and such.

The conversation regarding the work done so far can be found in the [Apostrophe Forums](http://forum.apostrophecms.org/t/port-apostrophe-localization-to-2-0-0/118/7)

## Installation

We have yet to deploy this as an NPM module, so for now you can just clone it into your ```lib/modules``` directory

## Configuration

You can configure this either at the application level

```
//app.js

modules:{
 ... other modules ...
 'existanze-docs-localized':{
      "default":"en",
      "locales":{
        "el":{
          "iso":"EL"
        },
        "en":{
          "iso":"EN"
        }
      },
      "localized":[
        ,"branch:store"
        ,"branch:region"
        ... other types / properties ...
      ]
    },
}
```


At the moment all areas are translated if you wish just by changing the content of the area in whichever locale you are in. 
The module falls back to the content already in the document if it doesn't exist for a locale. _This is also true for for pieces_

Pieces / Pages **properties** are localized using the ```localized``` key of the module configuration.
Where the format of the configuration option is ```[module_name]:[property]```. 
_A common source of problems is the **alias** name of the module_


##TODO

- [ ] Never Types
- [ ] Universal Content 






