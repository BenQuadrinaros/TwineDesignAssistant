const linkParser = require('./link-parser');
const getOnlyArg = new RegExp(/(?<=:[\s]*)(.*)(?=\)$)/g);

function find(script,regex){
    var result  = script.match(regex);
    if(result!=null && result.length>0){
        return result[0]
    }
    return null;
}


module.exports = (tokens) => {
    var nodes = tokens;
    const htmlParser = new DOMParser(); //We'll use this javascript built in html parser to translate html for us


    //Map each macro to a function that extracts all the important info
    //from that macro
    var managedMacros = new Map([
        ["mouseout-goto", function(script){
            var values = find(script,getOnlyArg)
            if(values != null){
                values = values.split("\"");
            }else{
                return;
            }
            return {
                type:"passageLink",
                display: values[1],
                target: values[3],
                input: "mouseout"
            }
        }],
        ["mouseover-goto", function(script){
            var values = find(script,getOnlyArg)
            if(values != null){
                values = values.split("\"");
            }else{
                return;
            }
            return {
                type:"passageLink",
                display: values[1],
                target: values[3],
                input: "mouseover"
            }
        }],
        ["click-goto", function(script){
            var values = find(script,getOnlyArg)
            if(values != null){
                values = values.split("\"");
            }else{
                return;
            }
            return {
                type:"passageLink",
                display: values[1],
                target: values[3],
                input: "click"
            }
        }],
        ["mouseout-append", function(script){
            return {
                type:"link-append",
                target: find(script,getOnlyArg),
                input: "mouseout"
            }
        }],
        ["mouseout-replace", function(script){
            return {
                type:"link-replace",
                target: find(script,getOnlyArg),
                input: "mouseout"
            }
        }],
        ["show", function(script){
            return {
                type:"show",
                target: find(script,getOnlyArg),
            }
        }],
        ["live", function(script){
            return {
                type:"live",
                duration: find(script,getOnlyArg),
            }
        }],
        ["stop", function(_script){
            return {type: "stop"}
        }],
        ["event", function(script){
            return{
                type:"conditional",
                condition: "event",
                value: find(script,getOnlyArg)
            } 
        }],
        ["more", function(_script){
            return{
                type:"conditional",
                condition: "more"
            }
        }],
        ["unless", function(script){
            return{
                type:"conditional",
                condition: "unless "+ find(script,getOnlyArg)
            }
        }],
        ["else-if", function(script){
            return{
                type:"conditional",
                condition: "else-if "+ find(script,getOnlyArg)
            }
        }],
        ["else", function(_script){
            return{
                type:"conditional",
                condition: "else" 
            }
        }],
        ["if", function(script){
            return{
                type:"conditional",
                condition: "if "+ find(script,getOnlyArg)
            }
        }],
        ["prompt", function(script){
            var values = find(script,getOnlyArg)
            if(values != null){
                values = values.split(",");
            }
            return {
                type:"popup",
                display: values[0],
                value: values[1],
                input: "typing"
            }
        }],
        ["confirm", function(script){
            var values = find(script,getOnlyArg)
            if(values != null){
                values = values.split(",");
            }
            return {
                type:"popup",
                display: values[0],
                value: "boolean",
                input: "click"
            }
        }],
        ["alert", function(script){
            var values = find(script,getOnlyArg)
            if(values != null){
                values = values.split(",");
            }
            return {
                type:"popup",
                display: values[0],
                input: "click"
            }
        }],
        ["mouseout-prepend", function(script){
            return {
                type:"link-prepend",
                target: find(script,getOnlyArg),
                input: "mouseout"
            }
        }],
        ["mouseout-append", function(script){
            return {
                type:"link-append",
                target: find(script,getOnlyArg),
                input: "mouseout"
            }
        }],
        ["mouseout-replace", function(script){
            return {
                type:"link-replace",
                target: find(script,getOnlyArg),
                input: "mouseout"
            }
        }],
        ["mouseover-prepend", function(script){
            return {
                type:"link-prepend",
                target: find(script,getOnlyArg),
                input: "mouseover"
            }
        }],
        ["mouseover-append", function(script){
            return {
                type:"link-append",
                target: find(script,getOnlyArg),
                input: "mouseover"
            }
        }],
        ["mouseover-replace", function(script){
            return {
                type:"link-replace",
                target: find(script,getOnlyArg),
                input: "mouseover"
            }
        }],
        ["click-prepend", function(script){
            return {
                type:"link-prepend",
                target: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["click-append", function(script){
            return {
                type:"link-append",
                target: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["click-replace", function(script){
            return {
                type:"link-replace",
                target: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["move", function(script){
            var source = find(script,new RegExp(/(?<=:[\s]*)(.*)(?=\sinto)/g));
            var target = find(script,new RegExp(/(?<=into\s)(\S*)(?=\)$)/g));
            return {
                type:"move",
                source: source,
                target: target
            }
        }],
        ["put", function(script){
            var value = find(script,new RegExp(/(?<=:[\s]*)(.*)(?=\sinto)/g));
            var variable = find(script,new RegExp(/(?<=into\s)(\S*)(?=\)$)/g));
            return {
                type:"put",
                target: variable,
                value: value
            }
        }],
        ["set", function(script){
            var variable = find(script,new RegExp(/(?<=:[\s]*)(.*)(?=\sto)/g));
            var value = find(script,new RegExp(/(?<=to[\s]+)(.*)(?=\)$)/g));
            return {
                type:"set",
                target: variable,
                value: value
            }
        }],
        ["font", function(script){
            var font = find(script,getOnlyArg);
            return {
                type:"font",
                value:font
            }
        }],
        ["passagelink",function(script){ return linkParser(script); }],

        //Macros added with update of Twine version    ---------

        ["change", function(script){
            var target = find(script,new RegExp(/(?<=:[\s]*)(.*)(?=[\s]*,)/g));
            var value = find(script,new RegExp(/(?<=,[\s]*)(\(.*\))(?=[\s]*\))/g));
            return {
                type:"change",
                target:target,
                value:value
            }
        }],
        ["enchant", function(script){
            var target = find(script,new RegExp(/(?<=:[\s]*)(.*)(?=[\s]*,)/g));
            var value = find(script,new RegExp(/(?<=,[\s]*)(\(.*\))(?=[\s]*\))/g));
            return {
                type:"enchant",
                target:target,
                value:value
            }
        }],
        ["enchant-in", function(script){
            var target = find(script,new RegExp(/(?<=:[\s]*)(.*)(?=[\s]*,)/g));
            var value = find(script,new RegExp(/(?<=,[\s]*)(\(.*\))(?=[\s]*\))/g));
            return {
                type:"enchant",
                target:target,
                value:value
            }
        }],
        // Border and border modifier macros
        ["border", function(script){
            var border = find(script,getOnlyArg);
            return {
                type:"border",
                value:border
            }
        }],
        ["b4r", function(script){
            var border = find(script,getOnlyArg);
            return {
                type:"border",
                value:border
            }
        }],
        ["border-color", function(script){
            var color = find(script,getOnlyArg);
            return {
                type:"border-modifier",
                value:color
            }
        }],
        ["b4r-color", function(script){
            var color = find(script,getOnlyArg);
            return {
                type:"border-modifier",
                value:color
            }
        }],
        ["b4r-colour", function(script){
            var color = find(script,getOnlyArg);
            return {
                type:"border-modifier",
                value:color
            }
        }],
        ["border-size", function(script){
            var size = find(script,getOnlyArg);
            return {
                type:"border-modifier",
                value:size
            }
        }],
        ["b4r-size", function(script){
            var size = find(script,getOnlyArg);
            return {
                type:"border-modifier",
                value:size
            }
        }],
        ["corner-radius", function(script){
            var radius = find(script,getOnlyArg);
            return {
                type:"border-modifier",
                value:radius
            }
        }],
        // -------------------------------------
        ["sequence-link", function(script) {
            var target = find(script,new RegExp(/(?<=:[\s]*)bind[\s]+(.+)(?=[\s]*,)/g));
            var value = "";
            if (target) {
                //cut off other parameters
                if(target.indexOf(',') > -1) { target = target.substring(0, target.indexOf(',')); }
                value = find(script,new RegExp(/(?<=bind[\s]*.+[\s]*,[\s]*)(.+)(?=[\s]*\))/g));
                return {
                    type:"link-cycle",
                    target:target,
                    value:value
                }
            } else {
                value = find(script,getOnlyArg);
                return {
                    type:"link-cycle",
                    value:value
                }
            }
        }],
        ["seq-link", function(script) {
            var target = find(script,new RegExp(/(?<=:[\s]*)bind[\s]+(.+)(?=[\s]*,)/g));
            var value = "";
            if (target) {
                //cut off other parameters
                if(target.indexOf(',') > -1) { target = target.substring(0, target.indexOf(',')); }
                value = find(script,new RegExp(/(?<=bind[\s]*.+[\s]*,[\s]*)(.+)(?=[\s]*\))/g));
                return {
                    type:"link-cycle",
                    target:target,
                    value:value
                }
            } else {
                value = find(script,getOnlyArg);
                return {
                    type:"link-cycle",
                    value:value
                }
            }
        }],
        ["cycling-link", function(script) {
            var target = find(script,new RegExp(/(?<=:[\s]*)bind[\s]+(.+)(?=[\s]*,)/g));
            var value = "";
            if (target) {
                //cut off other parameters
                if(target.indexOf(',') > -1) { target = target.substring(0, target.indexOf(',')); }
                value = find(script,new RegExp(/(?<=bind[\s]*.+[\s]*,[\s]*)(.+)(?=[\s]*\))/g));
                return {
                    type:"link-cycle",
                    target:target,
                    value:value
                }
            } else {
                value = find(script,getOnlyArg);
                return {
                    type:"link-cycle",
                    value:value
                }
            }
        }],
        // All text box macros
        ["input-box", function(script){
            var target = find(script,new RegExp(/(?<=:[\s]*)bind[\s]+(.+)(?=[\s]*,)/g));
            var value = "";
            if(target) {
                //cut off other parameters
                if(target.indexOf(',') > -1) { target = target.substring(0, target.indexOf(',')); }
                value = find(script,new RegExp(/(?<=bind[\s]*.+[\s]*,[\s]*)(.+)(?=[\s]*\))/g));
                return {
                    type:"text-box",
                    target:target,
                    value:value,
                    input:"typing"
                }
            } else {
                value = find(script,getOnlyArg);
                return {
                    type:"text-box",
                    value:value,
                    input:"typing"
                }
            }
        }], 
        ["force-input-box", function(script){
            var target = find(script,new RegExp(/(?<=:[\s]*)bind[\s]+(.+)(?=[\s]*,)/g));
            var display = find(script,new RegExp(/(?<=,[\s]*)(.+)(?=[\s]*\))/g));
            // This will cut part of the display if it contains a ","
            while(display.indexOf(',') > -1) { display = display.substring(display.indexOf(',')+1, display.length); }
            console.log("display: " + display);
            var value = "";
            if(target) {
                //cut off other parameters
                while(target.indexOf(',') > -1) { target = target.substring(0, target.indexOf(',')); }
                value = find(script,new RegExp(/(?<=bind[\s]*.+[\s]*,[\s]*)(.+)(?=[\s]*\))/g));
                value = value.substring(0, value.lastIndexOf(','));
                return {
                    type:"force-text-box",
                    target:target,
                    value:value,
                    display:display,
                    input:"typing"
                }
            } else {
                value = find(script,getOnlyArg);
                value = value.substring(0, value.lastIndexOf(','));
                return {
                    type:"force-text-box",
                    value:value,
                    display:display,
                    input:"typing"
                }
            }
        }],
        ["box", function(script){
            return {
                type: "text-box",
                value: find(script,getOnlyArg)
            }
        }],
        ["float-box", function(script){
            return {
                type: "text-box",
                value: find(script,getOnlyArg)
            }
        }],
        // ---------------------------------------
        // Misc other interactive ffect macros
        ["checkbox", function(script){
            var fields = find(script,getOnlyArg);
            return {
                type:"checkbox",
                target:fields.substring(0,fields.indexOf(',')),
                display:fields.substring(fields.indexOf(',')+1,fields.length),
                input:"click"
            }
        }],
        ["checkbox-fullscreen", function(script){
            return {
                type:"fullscreen",
                display:find(script,getOnlyArg),
                input:"click"
            }
        }],
        ["button", function(){ return { type: "button" }; }],
        // --------------------------------------
        // Styling macros with targets
        // These all need hooks
        // Should we be accounting for those macros?
        ["char-style", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["line-style", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["link-style", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["opacity", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["text-indent", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["text-rotate-x", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["text-rotate-y", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["text-rotate-z", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        ["text-size", function(script){
            return {
                type: "enchant",
                value: find(script,getOnlyArg)
            }
        }],
        // --------------------------------------
        ["meter", function(script){
            var fields = find(script,getOnlyArg);
            //First argument is variable bound to (NEEDED)
            var target = fields.substring(0, fields.indexOf(','));
            fields = fields.substring(fields.indexOf(',')+1, fields.length);
            //Second argument is maximum value (NEEDED)
            var value = fields.substring(0, fields.indexOf(',')+1);
            fields = fields.substring(fields.indexOf(',')+1, fields.length);
            //Third argument is positioning (NEEDED)
            if(fields.indexOf(',') > -1) {
                value += fields.substring(0, fields.indexOf(','));
                fields = fields.substring(fields.indexOf(',')+1, fields.length);
                //Anything left is text or color display (OPTIONAL)
                return {
                    type: "meter",
                    target:target,
                    value:value,
                    display:fields
                }
            } else {
                return {
                    type: "meter",
                    target:target,
                    value:value + fields
                }
            }
        }], 
        // link- type macros
        ["link", function(script){
            return {
                type: "link",
                display: find(script, getOnlyArg),
                input: "click"
            }
        }],
        ["link-repeat", function(script){
            return {
                type: "link-repeat",
                display:find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["link-rerun", function(script){
            return {
                type: "link-rerun",
                display: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["link-reveal", function(script){
            return {
                type: "link-reveal",
                display:find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["link-goto", function(script){
            var values = find(script,getOnlyArg)
            if(values.indexOf(',') > -1){
                values = values.split(",");
                return {
                    type:"passageLink",
                    display: values[0],
                    target: values[1],
                    input: "click"
                }
            }else{
                return {
                    type:"passageLink",
                    display: values,
                    target: values,
                    input: "click"
                }
            }
        }],
        ["link-reveal-goto", function(script){
            //only difference from previous is additional functionality inside of hook
            var values = find(script,getOnlyArg)
            if(values.indexOf(',') > -1){
                values = values.split(",");
                return {
                    type:"passageLink",
                    display: values[0],
                    target: values[1],
                    input: "click"
                }
            }else{
                return {
                    type:"passageLink",
                    display: values,
                    target: values,
                    input: "click"
                }
            }
        }],
        ["link-undo", function(script){
            return {
                type:"undo",
                display: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["link-fullscreen", function(script){
            return {
                type:"fullscreen",
                display: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["link-show", function(script){
            var values = find(script,getOnlyArg);
            values = values.split(',');
            return {
                type:"show",
                target: values[1],
                display: values[0],
                input: "click"
            }
        }],
        // --------------------------------------
        // undo type macros
        ["undo", function(script){
            return { type: "undo" }
        }],
        ["click-undo", function(script){
            return {
                type:"undo",
                display: find(script,getOnlyArg),
                input: "click"
            }
        }],
        ["mouseover-undo", function(script){
            return {
                type:"undo",
                display: find(script,getOnlyArg),
                input: "mouseover"
            }
        }],
        ["mouseout-undo", function(script){
            return {
                type:"undo",
                display: find(script,getOnlyArg),
                input: "mouseout"
            }
        }],
        // --------------------------------------
        ["after", function(script){
            var values = find(script,getOnlyArg);
            if(values.indexOf(',') > -1) {
                var duration = values.substring(0,values.indexOf(','));
                values = values.substring(values.indexOf(','), values.length);
                return {
                    type: "live",
                    duration: duration,
                    value: values
                }
            } else {
                return {
                    type: "live",
                    duration: values
                }
            }
        }],
        ["append-with", function(script){
            return {
                type: "append",
                display: find(script,getOnlyArg)
            }
        }],
        ["append", function(script){
            return {
                type: "append",
                target: find(script,getOnlyArg)
            }
        }],
        ["prepend-with", function(script){
            return {
                type: "prepend",
                display: find(script,getOnlyArg)
            }
        }],
        ["prepend", function(script){
            return {
                type: "prepend",
                target: find(script,getOnlyArg)
            }
        }],
        ["replace-with", function(script){
            return {
                type: "replace",
                display: find(script,getOnlyArg)
            }
        }],
        ["replace", function(script){
            return {
                type: "replace",
                target: find(script,getOnlyArg)
            }
        }],
        ["rerun", function(script){
            return {
                type: "replace",
                target: find(script,getOnlyArg)
            }
        }],
        ["hide", function(script){
            return {
                type: "hide",
                target: find(script,getOnlyArg)
            }
        }],
        ["random",function(script){
            return {
                type: "random",
                value: find(script,getOnlyArg)
            }
        }],
        ["either", function(script){
            return {
                type: "selection",
                value: find(script,getOnlyArg)
            }
        }],
        //All sidebar & icon set macros
        ["icon-undo", function(script){
            return {
                type: "icon-undo",
                display: find(script,getOnlyArg),
                input: "click"   //Does this count as input?
            }
        }],
        ["icon-redo", function(script){
            return {
                type: "icon-redo",
                display: find(script,getOnlyArg),
                input: "click"   //Does this count as input?
            }
        }],
        // ----------------------------
        //All storylet macros
        ["storylet", function(script){
            return {
                type: "storylet",
                condition: find(script,getOnlyArg)
            }
        }],
        ["open-storylet", function(script){
            return {
                type: "storylet",
                target: find(script,getOnlyArg)
            }
        }],
        ["exclusivity", function(script){
            return {
                type: "storylet-modifier",
                value: find(script,getOnlyArg)
            }
        }],
        ["urgency", function(script){
            return {
                type: "storylet-modifier",
                value: find(script,getOnlyArg)
            }
        }],
        // ----------------------------
        // Transition and transition modification macros
        ["transition", function(script){
            return {
                type: "transition",
                value: find(script,getOnlyArg)
            }
        }],
        ["transition-delay", function(script){
            return {
                type: "transition-modifier",
                value: find(script,getOnlyArg)
            }
        }],
        ["t8n-delay", function(script){
            return {
                type: "transition-modifier",
                value: find(script,getOnlyArg)
            }
        }],
        ["transition-skip", function(script){
            return {
                type: "transition-modifier",
                value: find(script,getOnlyArg),
                input: "key-press"
            }
        }],
        ["t8n-skip", function(script){
            return {
                type: "transition-modifier",
                value: find(script,getOnlyArg),
                input: "key-press"
            }
        }],
        // -----------------------------------------
        ["animate", function(script){
            let values = find(script,getOnlyArg);
            let target = values.substring(0, values.indexOf(','));
            values = values.substring(values.indexOf(',')+1, values.length);
            // Technically a transition event, but it behaves like an enchant
            if(values.indexOf(',') > -1) {
                return {
                    type: "enchant",
                    target: target,
                    value: values.substring(0, values.indexOf(',')),
                    duration: values.substring(values.indexOf(',')+1, values.length)
                }
            } else {
                return {
                    type: "enchant",
                    target: target,
                    value: values
                }
            }
        }]
    ]);


    //--------------------------------------------------------------------------------------------------------
    //The main process start here
    //This pattern matchs name of a macro command for example, in (set:),
    //The word set would be matched
    var macroPattern = new RegExp(/[\w\-]+(?=:)/);
    var type,matchs;
    //loop through all the passages
    for(const passage of nodes){
        passage.nodes = [];
        //for every token in the passage
        for(const token of passage.tokens){
            var node;
            //For macros lookup the translation in our dictionary
            //console.log("at " + token.index + " we have " + token.type);
            if(token.type == 'Macro'){
                matchs = macroPattern.exec(token.script);
                if(matchs){
                    type = matchs[0];
                }
                //console.log("Macro found of type: " + type);
                if(managedMacros.has(type)){
                    node = managedMacros.get(type)(token.script);
                }else{//Handle the any macros that aren't in our dictionary
                    //For most tokens the value is just its first arguement
                    node = {
                        "type": type,
                        "value": find(token.script,getOnlyArg),
                        "script": token.script
                    }
                }
            }else if(token.type == "Html"){ // To translate html we rely on the javascript built in parser
                const html = htmlParser.parseFromString(token.script, "text/html");
                node = {
                    "type": "Html",
                    "tag": html.body.firstElementChild.tagName,
                    "classes": html.body.firstElementChild.classList,
                    "attributes": html.body.firstElementChild.attributes,
                    "innerText": html.body.firstElementChild.innerHTML
                }
            }else if(token.type == "PassageLink"){ 
                type = token.type;
                node = managedMacros.get(type.toLowerCase())(token.script);
            }else{ //this handle body tokens
                node = {
                    "type": token.type.toLowerCase(),
                    "script": token.script
                }
            }
            node.index = token.index;
            node.parent = token.parent;
            //if the token is a body we want to find it's matching parent
            //the parent is usually a condional macro
            if(node.type == "body"){
                for(var i = passage.nodes.length-1;i>=0;i--){
                    if(passage.nodes[i].type == "conditional" && passage.nodes[i].parent == node.parent){
                        node.parent = passage.nodes[i].index;
                        break;
                    }
                }
            }
            node.depth = token.depth; //Depth shows how deeply a macro is nested
            passage.nodes.push(node);
        }
        //remove the tokens to clear out some memory
        delete passage.tokens;
    }
    return nodes;
}