//Finds the most recent non-link node added to the graph
//The stack here represents the previous nodes we've added to the graph
//that belong to the current passage. The last node on the stack is the
//most recent node to be added
function findValidRecentNode(stack,node){
    
    //To find the most recent valid node we move backwards through the stack
    for(var i = stack.length-1; i>=0; i--){
        //If the node doesn't share the same parent skip it
        if(stack[i].parent != node.parent){
            continue;
        }
        //A valid node is any node thats not a passagelink or conditional
        if(stack[i].type != 'passagelink' && stack[i].type != 'conditional'){
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

//This function set up edges (arrows) from a parent to the current node
function setParent(graph,parent,node){
    //If there isn't and existing edge list make one. 
    if(!graph.edges.has(parent)){
        graph.edges.set(parent,new Set([node]));
    }else{ //Otherwise add the node to the parent's edge list
        //For macros nested in a body, the node should be linked to the the previous child 
        var children;
        if(parent.type == "body"){
            children = graph.edges.get(parent)
            for(child of children.values())
            {
                if(child.parent == parent){
                    parent = child;
                    break;
                }
            };
        }
        graph.edges.get(parent).add(node);
    }
}

function cleanUp(nodeTemp) {
    let node = nodeTemp;
    if(node.script) { //Trim extra quotes and spaces off script fields
        while(node.script.indexOf('\"') == 0 || node.script.indexOf('\'') == 0 || node.script.indexOf(' ') == 0) {
            node.script = node.script.substring(1, node.script.length);
        }
        while(node.script.indexOf('\"') == node.script.length-1 || node.script.indexOf('\'') == node.script.length-1 ||
            node.script.indexOf(' ') == node.script.length-1) {
            node.script = node.script.substring(0, node.script.length-1);
        }
    }
    if(node.value) { //Trim extra quotes and spaces off value fields
        while(node.value.indexOf('\"') == 0 || node.value.indexOf('\'') == 0 || node.value.indexOf(' ') == 0) {
            node.value = node.value.substring(1, node.value.length);
        }
        while(node.value.indexOf('\"') == node.value.length-1 || node.value.indexOf('\'') == node.value.length-1 ||
            node.value.indexOf(' ') == node.value.length-1) {
            node.value = node.value.substring(0, node.value.length-1);
        }
        while(node.value.indexOf('\"') > -1) {
            node.value = node.value.substring(0, node.value.indexOf('\"')) + 
                node.value.substring(node.value.indexOf('\"')+1, node.value.length);
        }
        while(node.value.indexOf('\'') > -1) {
            node.value = node.value.substring(0, node.value.indexOf('\'')) + 
                node.value.substring(node.value.indexOf('\'')+1, node.value.length);
        }
    }
    if(node.target){ //Trim extra quotes and spaces off target fields
        while(node.target.indexOf('\"') == 0 || node.target.indexOf('\'') == 0 || node.target.indexOf(' ') == 0) {
            node.target = node.target.substring(1, node.target.length);
        }
        while(node.target.indexOf('\"') == node.target.length-1 || node.target.indexOf('\'') == node.target.length-1 ||
            node.target.indexOf(' ') == node.target.length-1) {
            node.target = node.target.substring(0, node.target.length-1);
        }
    }
    if(node.display){ //Trim extra quotes and spaces off display fields
        while(node.display.indexOf('\"') == 0 || node.display.indexOf('\'') == 0 || node.display.indexOf(' ') == 0) {
            node.display = node.display.substring(1, node.display.length);
        }
        while(node.display.indexOf('\"') == node.display.length-1 || node.display.indexOf('\'') == 
            node.display.length-1 || node.display.indexOf(' ') == node.display.length-1) {
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
        // Take a passage out of passagesToProcess
        var currentPassage = passagesToProcess.pop();
        // Loop through all the nodes in this passage
        for(node of currentPassage.nodes){
            // Try to find the parent for this current node
            var parent = currentPassage.nodes.find((entry)=> entry.index == node.parent);
            
            //If we don't have a parent then this node picks the most recent valid node 
            // as the parent.
            if(parent==null){
                parent = findValidRecentNode(currentPassage.stack,node,currentPassage.nodes);
            }
            
            //Ben: Works generically, may want to verify that it lines up the graph
            //     in a way that is helpful for Story Graph

            // Include either of these lines if we want every node listed under their Interaction Unit
            //node.parent = parent.index;   // Just the index
            // OR
            //node.parent = parent;         // The whole IU

            //Add this node to it's parent's edgelist 
            setParent(graph,parent,node);

            //These two special node types will add new passages to process   
            if(node.type.toLowerCase() == 'passagelink' || node.type.toLowerCase() == 'link-goto'){
                
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
                    var targetNode = createPassageNode(graph,target);
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
                    console.log("error at "+node.target)
                    console.log(e)
                }
            }

            //Clean up extraneous punctuation off various fields
            //Entirely for display purposes
            node = cleanUp(node);

            //Wrap text in scripts sicne they can get rather long
            if(node.script) {
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
            //Also add it to the end of the stack. 
            //The stack holds all the nodes from a passage that have been added to the graph) .
            graph.nodes.push(node);
            currentPassage.stack.push(node);
        }
    }
    return graph;
    
}