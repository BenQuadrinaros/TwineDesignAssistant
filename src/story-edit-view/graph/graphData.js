//Twine Design Assistant v.0.5.1
// Project Lead: Elin Carstensdottir, University of California: Santa Cruz
// Built by Jannelyn Camingue, Katie Moses, Bjarke Larson, Ben Rowland

//Finds the most recent non-link node added to the graph
//The stack here represents the previous nodes we've added to the graph
//that belong to the current passage. The last node on the stack is the

const { keyFor } = require("core-js/fn/symbol");
const passage = require("../../data/actions/passage");

//most recent node to be added
function findValidRecentNode(stack,node){
    //To find the most recent valid node we move backwards through the stack
    //console.log("finding valid parent for",node,"in stack of",stack);
    for(var i = stack.length-1; i>=0; i--){
        //If the node doesn't share the same parent skip it (except bodies)
        if(stack[i].parent != node.parent) {
            continue;
        }
        //A valid node is any node thats not a passagelink or conditional
        if(stack[i].type.toLowerCase() != 'passagelink') {
            return stack[i];
        }
        
    }
    
    //If no nodes match the requirements, take the previous node
    return stack[stack.length-1];
}

//PassageNodes display info about the passage and is always the first (or root)
//node for all the nodes in a passage.
//This is the only node thats does not come from the story's script.
function createPassageNode(graph,target){
    var passageNode = {
        "name":target.passage,
        "id": target.id,
        "type": "Passage",
        "index": target.id
    }

    var targetNode = passageNode;
    //Try to find the passage node in the graph first
    var foundNodeAt = graph.nodes.findIndex((elem) => elem == passageNode);
    //If we can't find it return the one we just created
    if(foundNodeAt > -1){
        targetNode = graph.nodes[foundNodeAt];
    }else{ //Otherwise we add the node to the graph, and start the stack for this passage
        graph.nodes.push(passageNode);
        //The stack will hold all the nodes from a passage in the order they're added
        //The passageNode will always be the first
        target.stack = [passageNode];
    }
    return targetNode;
}

function findPassageByID (graph, passageID) {
    //console.log("searching for",passageID);
    for(nod of graph.nodes) {
        //console.log("found",node);
        if(nod.index == passageID) { return nod; }
    }
    return null;
}

function findNodeParent (graph, node) {
    //console.log("received ", node);
    for([parent, child] of graph.edges.entries()) {
        //console.log(" inspecting set",child);
        for(entry of child.values()) { 
            //console.log("  entry",entry);
            if(entry == node) {
                //console.log(" MATCH",parent);
                return parent;
            }
        }
    }
    //console.log(" NO MATCH");
    return null;
}

//This function sets up edges (arrows) from a parent to the current node
function setParent(graph,parent,node){
    //If there isn't and existing edge list make one. 
    if(!graph.edges.has(parent)){
        graph.edges.set(parent,new Set([node]));
    }else{ //Otherwise add the node to the parent's edge list
        graph.edges.get(parent).add(node);
    }
}

function cleanUp(nodeTemp) {
    let node = nodeTemp;
    if(node.script) { //Trim extra quotes and spaces off script fields

        if(node.script.indexOf('\"') == 0 || node.script.indexOf('\'') == 0 || node.script.indexOf(' ') == 0) {
            node.script = node.script.substring(1, node.script.length);
        }
        if(node.script.length > 0 && node.script.indexOf('\"') == node.script.length-1 
                || node.script.indexOf('\'') == node.script.length-1 || node.script.indexOf(' ') == node.script.length-1
                || node.script.indexOf('\n') == node.script.length-1) {
            node.script = node.script.substring(0, node.script.length-1);
        }
    }
    if(node.value) { //Trim extra quotes and spaces off value fields

        if(node.value.indexOf('\"') == 0 || node.value.indexOf('\'') == 0 || node.value.indexOf(' ') == 0) {
            node.value = node.value.substring(1, node.value.length);
    
        }
        if(node.value.length > 0 && node.value.indexOf('\"') == node.value.length-1 
                || node.value.indexOf('\'') == node.value.length-1 || node.value.indexOf(' ') == node.value.length-1
                || node.value.indexOf('\n') == node.value.length-1) {
            node.value = node.value.substring(0, node.value.length-1);
    
        }
        if(node.value.indexOf('\"') > -1) {
            node.value = node.value.substring(0, node.value.indexOf('\"')) + 
                node.value.substring(node.value.indexOf('\"')+1, node.value.length);
    
        }
        if(node.value.indexOf('\'') > -1) {
            node.value = node.value.substring(0, node.value.indexOf('\'')) + 
                node.value.substring(node.value.indexOf('\'')+1, node.value.length);
    
        }
    }
    if(node.target){ //Trim extra quotes and spaces off target fields

        if(node.target.indexOf('\"') == 0 || node.target.indexOf('\'') == 0 || node.target.indexOf(' ') == 0) {
            node.target = node.target.substring(1, node.target.length);
        }
        if(node.target.length > 0 && node.target.indexOf('\"') == node.target.length-1 
                || node.target.indexOf('\'') == node.target.length-1 || node.target.indexOf(' ') == node.target.length-1) {
            node.target = node.target.substring(0, node.target.length-1);
        }
    }
    if(node.display){ //Trim extra quotes and spaces off display fields

        if(node.display.indexOf('\"') == 0 || node.display.indexOf('\'') == 0 || node.display.indexOf(' ') == 0) {
            node.display = node.display.substring(1, node.display.length);
        }
        if(node.display.length > 0 && node.display.indexOf('\"') == node.display.length-1 
                || node.display.indexOf('\'') == node.display.length-1 || node.display.indexOf(' ') == node.display.length-1
                || node.display.indexOf('\n') == node.display.length-1) {
            node.display = node.display.substring(0, node.display.length-1);
        }
    }
    return node;
}

//This is the main function and what we export. Aka graphData()
module.exports = (passages, story) => {
    //Find the first passage of the story and create a list of passage to process
    var firstPassage = passages.find((passage) => passage.id == story.startPassage);
    var passagesToProcess = [firstPassage];
    
    //Note map entries are ordered by insertion order i.e first key added will be the first entry in the map
    //Maps are like dictionaries.
    //The graph object represents the abstraction layer graphs as a list of all nodes and an adjacency list
    var graph = {
        "nodes": [],
        "edges": new Map() //Edges will be represented as dictionary entries. The key will be the parent node.
                           //The value will be a list of all child nodes. So each entry represent all the (edges) arrows
                           //that come out of a node.
    };
    //We'll use visited to keep track of passage we've already visited
    //This will prevent us from getting trapped in cycles
    var visited = new Map();
    //Add in the first passage, so we do not return to it
    visited.set(firstPassage.id, "root");
    
    //To get the process started we have to first create a passage node and add it to the graph
    //This passage node will act as the root of our graph
    graph.nodes.push(createPassageNode(graph,firstPassage));

    
    
    //While there are still passages to process
    //Each loop will take out one passage from the list to process
    //Passagelinks will add new passages to process
    //By the end of this we should have explored every reachable passage
    while(passagesToProcess.length>0){
        //console.log("passages left",passagesToProcess);
        //Helper for placing nodes at the top of the passage
        var first = [];

        //Helper information for utilizing enchant target macros as a whole passage enchantment
        var markups = [];
        var enchantMacros = [];
        var skipStack = false;

        // Take a passage out of passagesToProcess
        var currentPassage = passagesToProcess.pop();
        //console.log("visiting passage",currentPassage);
        // Loop through all the nodes in this passage
        for(node of currentPassage.nodes) {
            //console.log("processing node",node);
            //Markups do not go on the stack
            if(node.type.indexOf("markup") > -1) {
                skipStack = true;
            }
            //If this macro can enchant any text in the passage
            if(node.type == "enchant" && node.target && node.depth == 0) {
                enchantMacros.push(node);
                skipStack = true;
            } else if (node.type == "popup" && node.depth == 0) {
                //Move any popup macros to the top of the graph due to their 
                // appearence of firing first visually
                var passag = findPassageByID(graph, currentPassage.id);
                for(temp of first) {
                    //Any nodes pointing to the passage header now point to the popup
                    graph.edges.get(passag).delete(temp);
                    setParent(graph,node,temp);
                }
                //Clear the listing
                first = [node];
                setParent(graph,passag,node);
            } else {
                //If node has a target, then add to end of passage search
                if(node.type.indexOf("markup") > -1) {
                    node.target = node.script.substring(1, node.script.length-1);
                    markups.push(node);
                }

                // Try to find the parent for this current node
                var parent = currentPassage.nodes.find((entry)=> entry.index == node.parent);
                
                //If we don't have a parent then this node picks the most recent valid node 
                // as the parent.
                if(parent==null){
                    parent = findValidRecentNode(currentPassage.stack,node,currentPassage.nodes);
                    if(parent.index == currentPassage.id) {
                        first.push(node);
                    }
                }

                //If this is a body node that has just been enchanted
                if(node.type == "body" && parent.body && parent.type == "enchant") {
                    //Remove enchantment from the graph
                    let grandparent = findNodeParent(graph, parent);
                    //console.log("grandparent",grandparent);
                    graph.edges.get(grandparent).delete(parent);
                    //Splice in new node
                    setParent(graph, node, parent);
                    setParent(graph, grandparent, node);
                    //Remove enchantment from the stack
                    currentPassage.stack.splice(currentPassage.stack.indexOf(parent), 1);
                }

                //Add this node to it's parent's edgelist 
                else {
                    setParent(graph,parent,node);
                }
            }

            //These two special node types will add new passages to process   
            if(node.type.toLowerCase() == 'passagelink' || node.type.toLowerCase() == 'link-goto') {
                
                //console.log("this one is a passage link",node);
                try{
                    //Target passage to look for in list of all passages
                    var lookFor;
                    //If encased in "target", then remove quotes
                    if(node.target.indexOf("\"") != -1) {
                        lookFor = node.target.substring(node.target.indexOf("\"") + 1);
                        lookFor = lookFor.substring(0, lookFor.indexOf("\""));
                    } else { //Otherwise, use the target field
                        lookFor = node.target;
                    }
                    
                    
                    //Try to find the destination of this link in the list of all passages
                    var target = passages.find((entry) => entry.passage == lookFor);
                    //Attempt to create a passagenode. Passagenodes are always the first node to appear
                    //before the rest of the nodes in a passage. 
                    if(target == undefined){
                        throw("Could not find target passage: " + lookFor + ". May be a spelling error?");
                    }
                    //console.log(node);
                    var targetNode = createPassageNode(graph,target); //HERE!

                    if(!graph.edges.has(node)){
                        graph.edges.set(node,new Set([targetNode]));
                    }else{
                        graph.edges.get(node).add(targetNode);
                    }
                    //Only visit new passages to avoid infinite loops
                    if(!visited.has(target.id)){
                        passagesToProcess.push(target);
                        visited.set(target.id,target);
                    }

                } catch(e) {
                    console.log("error adding a new passage at "+node.target)
                    console.log(e)
                }
            }

            //Clean up extraneous punctuation off various fields
            //Entirely for display purposes
    
            node = cleanUp(node);
    

            //Wrap text in scripts since they can get rather long
            if(node.script && node.script.length > 75) {
                let temp = "";
                let script = node.script;
                for(let i = 75; i < script.length; i += 75) {
                    temp = script.substring(0, i);
                    script = script.substring(i, script.length);
                    if(script.indexOf(' ') > -1) {
                        script = temp + script.substring(0, script.indexOf(' ')) + "\n" +
                            script.substring(script.indexOf(' ')+1, script.length);
                    } else {
                        script = temp + script;
                        break;
                    }
                }
    
                node.script = script;
            }
    

            
            //When we're done processing this node add to the story wide list of graph nodes
            //Also add it to the end of the stack, unless it was moved to the top. 
            //The stack holds all the nodes from a passage that have been added to the graph
            if (node.type == "popup" && node.depth == 0) {
                currentPassage.stack.splice(1, 0, node);
            } else if(!skipStack) {
                currentPassage.stack.push(node);
            } else {
                skipStack = false;
            }
            graph.nodes.push(node);

        }


        //End of passage
        for(var enchant of enchantMacros) {
            //console.log("enchant",enchant)
            if(enchant.target[0] == "?") {
                for(var mark of markups) {
                    //console.log("mark",mark);
                    if(enchant.target.substring(1) == mark.target) {
                        setParent(graph,mark,enchant);
                    }
                }
            } else {
                setParent(graph, findPassageByID(graph, currentPassage.id), enchant);
            }
        }
    }
    //End of story
    return graph;
    
}