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
            var value = find(script,new RegExp(/(?<=to[\s]+)(\S*)(?=\)$)/g));
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
        ["passagelink",function(script){ return linkParser(script);}],

        //Macros added with update of Twine version

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
                type:"border-color",
                value:color
            }
        }],
        ["b4r-color", function(script){
            var color = find(script,getOnlyArg);
            return {
                type:"border-color",
                value:color
            }
        }],
        ["b4r-colour", function(script){
            var color = find(script,getOnlyArg);
            return {
                type:"border-color",
                value:color
            }
        }],
        ["border-size", function(script){
            var size = find(script,getOnlyArg);
            return {
                type:"border-size",
                value:size
            }
        }],
        ["b4r-size", function(script){
            var size = find(script,getOnlyArg);
            return {
                type:"border-size",
                value:size
            }
        }],
        ["corner-radius", function(script){
            var radius = find(script,getOnlyArg);
            return {
                type:"corner-radius",
                value:radius
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