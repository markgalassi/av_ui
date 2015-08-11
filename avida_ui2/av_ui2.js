define.amd.jQuery = true;
require([
  "dijit/dijit",
  "dojo/parser",
  "dojo/_base/declare",
  "dojo/query",
  "dojo/NodeList-traverse",
  "maqetta/space",
  "maqetta/AppStates",
  "dijit/Dialog",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/MenuBar",
  "dijit/PopupMenuBarItem",
  "dijit/MenuItem",
  "dijit/Menu",
  "dijit/form/Button",
  "dijit/TitlePane",
  "dojo/dnd/Source",
  "dojo/dnd/Manager",
  "dojo/dnd/Selector",
  "dojo/dnd/Target",
  "dojo/dom-geometry",
  "dojo/dom-style",
  "dojo/dom",
  "dojo/aspect",
  "dojo/on", 
  "dijit/registry",
  "dijit/form/Select",
  "dijit/form/HorizontalSlider",
  "dijit/form/HorizontalRule",
  "dijit/form/HorizontalRuleLabels",
  "dijit/form/RadioButton",
  "dijit/form/ToggleButton",
  "dijit/form/NumberSpinner",
  "dijit/form/ComboButton",
  "dijit/form/DropDownButton",
  "dijit/form/ComboBox",
  "dijit/form/Textarea",
  "dojox/charting/Chart", 
  "dojox/charting/axis2d/Default", 
  "dojox/charting/plot2d/Lines",
  "dojox/charting/plot2d/Grid", 
  "dojox/charting/action2d/MouseZoomAndPan",
//  "dojox/charting/Theme",
  "dojox/charting/themes/Wetland",
  "dojo/ready",
  "jquery",
  "jquery-ui",
  "dojo/domReady!"
  ], function(dijit, parser, declare, query, nodelistTraverse, space, AppStates, Dialog,
              BorderContainer, ContentPane, MenuBar, PopupMenuBarItem, MenuItem, Menu, 
              Button, TitlePane, dndSource, dndManager, dndSelector, dndTarget, domGeometry, domStyle, dom,
              aspect, on, registry, Select,
              HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ToggleButton, NumberSpinner, ComboButton,
              DropDownButton, ComboBox, Textarea, Chart, Default, Lines, Grid, MouseZoomAndPan, Wetland, ready, $, jqueryui){

    parser.parse();
    var uiWorker = new Worker('ui-test.js');

    //process message from web worker
    uiWorker.onmessage = function(ee){
      var msg = ee.data;  //passed as object rather than string so JSON.parse is not needed.
      switch(msg.Key){
        case 'RunPause':
          if (true != msg["Success"]) {
          console.log("Error: ", msg);  // msg failed
          runStopFn();  //flip state back since the message failed to get to Avida
        }
          break;
        case 'Reset':
          if (true != msg["Success"]) { console.log("Reset failed: ", msg)};
          break;
        case 'OrgTrace':
          traceObj = msg;
          cycle = 0;
          cycleSlider.set("maximum", traceObj.length-1);
          cycleSlider.set("discreteValues", traceObj.length);
          updateOrgTrace(traceObj, cycle);
          break;
        case 'PopulationStats':
          updatePopStats(msg)
          break;
        default:
          console.log('UnknownRequest: ', msg);
          break;
      }
    }

    // Resize window helpers -------------------------------------------
    // called from script in html file as well as below
    BrowserResizeEventHandler=function(){
      if ("block"==domStyle.get("analysisBlock","display")){AnaChartFn();};
      if ("block"==domStyle.get("populationBlock","display")){popChartFn();};
      //update size of circular genome when size of holder changed. This needs more work when slider works.
      if ("block"==domStyle.get("organismBlock","display")){
        if (undefined != traceObj) { updateOrgTrace(traceObj, cycle);}; 
      } 
    }

    ready(function(){
      aspect.after(registry.byId("popChartHolder"), "resize", function(){BrowserResizeEventHandler()});
      aspect.after(registry.byId("organismCanvasHolder"), "resize", function(){BrowserResizeEventHandler()});
    });

    var oldwidth = 0;
    aspect.after(registry.byId("popRight"), "resize", function(){
      if (registry.byId("popRight").domNode.style.width != oldwidth) {
        oldwidth = registry.byId("popRight").domNode.style.width;
        var str = registry.byId("popRight").domNode.style.width;
        registry.byId("selectOrganPane").domNode.style.width=Math.round((Number(str.substr(0,str.length-2))-50)*0.45)+"px"
        registry.byId("mainBC").layout();  
      }
    });

    // Drop down menu buttons ------------------------------------------
    
    HardwareDialog = new Dialog({
      title: "Avida : A Guided Tour of an Ancestor and its Hardware",
      id: "HardwareDialog",
      href: "cpu_tour.html"
      //hide: function() {HardwareDialog.destroy()}
      //style: "width: 600px; height: 400px"
    });
    
    domStyle.set(HardwareDialog.containerNode, {
      position: 'relative'
    });
    
    dijit.byId("Hardware").on("Click", function(){ 
      if (!HardwareDialog) {
        HardwareDialog = new Dialog({
          title: "Avida : A Guided Tour of an Ancestor and its Hardware",
          id: "HardwareDialog",
          href: "cpu_tour.html"
          //hide: function() {HardwareDialog.destroy()}
          //style: "width: 600px; height: 400px"
        });
      }
      console.log(HardwareDialog);
      HardwareDialog.show();
    });

    // main button scripts-------------------------------------------
    
    //The style display: none cannnot be used in the html durint the initial load as the dijits won't work right
    //visibility:hidden can be used, but it leave the white space and just does not display dijits. 
    //So all areas are loaded, then the mainBoxSwap is called to set display to none after the load on all but 
    //the default option.
    //mainBoxSwap("organismBlock");
    mainBoxSwap("populationBlock");
    dijit.byId("setupBlock").set("style", "display: none;");

    function mainBoxSwap(showBlock){
      //console.log("in mainBoxSwap");
      dijit.byId("populationBlock").set("style", "display: none;");
      dijit.byId("organismBlock").set("style", "display: none;");
      dijit.byId("analysisBlock").set("style", "display: none;");
      dijit.byId("testBlock").set("style", "display: none;");
      dijit.byId(showBlock).set("style", "display: block; visibility: visible;");
      dijit.byId(showBlock).resize();
    };
  
    // Call general function
    document.getElementById("populationButton").onclick = function(){ mainBoxSwap("populationBlock"); }
    document.getElementById("organismButton").onclick = function(){ 
      mainBoxSwap("organismBlock"); 
      //document.getElementById("organismCanvas").resize();  //.resize is not a function
    }
    document.getElementById("analysisButton").onclick = function(){ mainBoxSwap("analysisBlock"); }
    document.getElementById("testButton").onclick = function(){ mainBoxSwap("testBlock"); }

    /* ********************************************************************** */
    /* Drag N Drop Freezer ****************************************************/
    /* ********************************************************************** */
    
    dojo.declare("AcceptOneItemSource", dndSource, {
      checkAcceptance : function(source, nodes) {
        if (this.node.children.length >= 1) {
           return false;
        }
        return this.inherited(arguments);
      }
    });
          
    var freezeConfigure = new dndSource("freezeConfigureNode", {accept: ["conDish"], copyOnly: ["true"], singular: "true"});
    freezeConfigure.insertNodes(false, [
      { data: "@default",      type: ["conDish"]},
      { data: "s20m.2Nand",    type: ["conDish"]},
      { data: "s30m.2Not",     type: ["conDish"]}
    ]);
    //console.log("freezeConfigure: ", freezeConfigure.map);
    var freezeOrgan = new dndSource("freezeOrgansimNode", {accept: ["organism"], copyOnly: ["true"], singular: "true"});
    freezeOrgan.insertNodes(false, [
      { data: "@ancestor",      type: ["organism"]},
      { data: "m2u8000Nand",    type: ["organism"]},
      { data: "m2u8000Not",     type: ["organism"]}
    ]);
    var freezePopDish = new dndSource("freezePopDishNode", {accept: ["popDish"], copyOnly: ["true"], singular: "true"});
    freezePopDish.insertNodes(false, [
      { data: "example",       type: ["popDish"]},
      { data: "m2w30u1000nand", type: ["popDish"]},
      { data: "m2w30u1000not",  type: ["popDish"]}
    ]);
    var AncestorBox = new dndSource("AncestorBoxNode", {accept: ["organism"]});
    //Have not made final decision about which div the dnd will connect to
    //var gridBoxNode = "gridBoxNode";  //the div around the grid
    var gridBoxNode = "gridCanvas";   //the actual canvas object
    var GridBox = new dndSource(gridBoxNode, {accept: ["organism"]}); 
    
    var trash = new dndSource("trashNode", {accept: ['conDish', 'organism', 'popDish'], singular: "true"});
    var ConfigCurrent = new dndTarget("ConfigurationCurrent", {accept: ["conDish"], singular: "true"});
    ConfigCurrent.insertNodes(false, [{ data: "@default",      type: ["conDish"]}]);
    //http://stackoverflow.com/questions/11909540/how-to-remove-delete-an-item-from-a-dojo-drag-and-drop-source
    var OrganCurrent = new dndSource("OrganCurrentNode", {accept: ["organism"], singular: "true"});

    var graphPop1 = new dndSource("pop1name", {accept: ["popDish"], singular: "true"});
    var graphPop2 = new dndSource("pop2name", {accept: ["popDish"], singular: "true"});
    var graphPop3 = new dndSource("pop3name", {accept: ["popDish"]});
    //console.log("after create graphPopulations");

    //http://stackoverflow.com/questions/1134572/dojo-is-there-an-event-after-drag-drop-finished
    //Puts the contents of the source in a object (list) called items. 
    function getAllItems(source){
      var items = source.getAllNodes().map(function(node){
        return source.getItem(node.id);
      });
      return items;
    }
    
    //Need to have only the most recent dropped configuration in configCurrent. Do this by deleting everything in configCurrent
    //and reinserting the most resent one after a drop event.
    function ConfigCurrentChange(){
      var items = getAllItems(ConfigCurrent);  //get a list of items after ondrop into configCurrent. 
      if (1 < items.length) {                   //if there is more than one, then get rid of the old one and keep the one just dropped.
        ConfigCurrent.selectAll().deleteSelectedNodes();  //http://stackoverflow.com/questions/11909540/how-to-remove-delete-an-item-from-a-dojo-drag-and-drop-source
        freezeConfigure.forInSelectedItems(function(item, id){
          ConfigCurrent.insertNodes(false, [item]);  //assign the node that is selected from the only valid source.
        });
        ConfigCurrent.sync();   
      }
    };
    dojo.connect(ConfigCurrent, "onDrop", ConfigCurrentChange);

    //Need to have only the most recent dropped organism in OrganCurrent. Do this by deleting everything in organCurrent
    //and reinserting the most resent one after a drop event.
    function OrganCurrentChange(){
      var items = getAllItems(OrganCurrent);
      if (1 < items.length) {
        OrganCurrent.selectAll().deleteSelectedNodes();  //clear items  
        OrganCurrent.sync();   //should be done after insertion or deletion
        //OrganCurrent.insertNodes(false, [items[1]]);    //oldway only works part of the time depends on mouse position
        freezeOrgan.forInSelectedItems(function(item, id){  
          OrganCurrent.insertNodes(false, [item]);          //assign the node that is selected from the only  valid source.
        });
        OrganCurrent.sync();   
      }
      doOrgTrace();  //request new Organism Trace from Avida and draw that.    
      //(traceObj, cycle);  // Draw the initial genome of the dropped organism. 
    };
    dojo.connect(OrganCurrent, "onDrop", OrganCurrentChange);

    //uiWorker function
    function doOrgTrace() {
       var request = {
          'Key':'OrgTrace', 
          'PtMuteRate': '0.02',
          'Seed': '0'  // sets to demo mode; optional if left off it is experimental mode
       };
       uiWorker.postMessage(request);
    }

    function trashChange(){
      var items = getAllItems(trash);
      trash.selectAll().deleteSelectedNodes();  //does appear to clear items  
    }
    dojo.connect(trash, "insertNodes", trashChange);

    //used to re-name freezer items after they are created.
    //http://jsfiddle.net/bEurr/10/
    //for now this function only changes the textContent (or innerHTML)
    function contextMenu(fzItemID, fzSection) {
      var aMenu;
      aMenu = new dijit.Menu({ targetNodeIds: [fzItemID]});
      aMenu.addChild(new dijit.MenuItem({
        label: "Rename",
        onClick: function() {
          var fzName = prompt("Please rename freezer item", document.getElementById(fzItemID).innerHTML);
          var namelist = dojo.query('> .dojoDndItem', fzSection);
          var unique = true;
          while (unique) {
            unique = false;
            if (fzName != document.getElementById(fzItemID).innerHTML){
              for (var ii = 0; ii < namelist.length; ii++){
                //console.log ("name ", namelist[ii].innerHTML);
                if (fzName == namelist[ii].innerHTML) {
                  fzName = prompt("Please give your freezer item a unique name ", fzName+"_1")
                  unique = true;
                  break;
                }
              }  
            }
          }
          if (null!=fzName) {
          //document.getElementById(fzItemID).innerHTML = fzName;}  //either works
          document.getElementById(fzItemID).textContent = fzName;}
        }
      }))
    };

    GridBox.on("MouseUp", function(evt){
       console.log("x", evt.layerX, "; y", evt.layerY); 
    });

    // does not work
    on(dom.byId("gridCanvas"),"drop", function(event){
      domGeometry.normalizeEvent(event);
      console.log("xx ", event.pageX);
      console.log("yy ", event.pageY);
    })

    var AncestorList = [];
    //This triggers for every dnd drop, not just those of freezeOrgan
    freezeOrgan.on("DndDrop", function(source, nodes, copy, target){
      //console.log("Source: ", source);
      //console.log("Nodes: ", nodes);
      //console.log("Copy: ", copy);
      //console.log("Target: ", target);
      if (target.node.id=="trashNode"){
        //http://stackoverflow.com/questions/1812148/dojo-dnd-move-node-programmatically
        source.parent.removeChild(nodes[0]);
        //target.parent.removeChild(nodes[0]);
      }
      if (target.node.id=="freezeConfigureNode"){
        // Asks for a name for any object dragged to the freezer. Need to check for duplicate names.
        // Does not change "data" value, only textContent changes.
        var dishCon = prompt("Please name your dish configuration", nodes[0].textContent+"_1");
        
                var namelist = dojo.query('> .dojoDndItem', 'freezeOrgansimNode');
        var unique = true;
        while (unique) {
          unique = false;
          for (var ii = 0; ii < namelist.length; ii++){
            //console.log ("name ", namelist[ii].innerHTML);
            if (dishCon == namelist[ii].innerHTML) {
              dishCon = prompt("Please give your configured dish a unique name ", dishCon+"_1")
              unique = true;
              break;
            }
          }  
        }
        if (null != dishCon) nodes[0].textContent=dishCon;
        contextMenu(nodes[0].id, target.node.id);
      }
      // Process Drop on GridBox
      if (target.node.id==gridBoxNode){
        freezeOrgan.forInSelectedItems(function(item, id){  
          AncestorBox.insertNodes(false, [item]);          //assign the node that is selected from the only valid source.
        });
        // need to create an array of ancestors to be used for color key
        AncestorList.push(nodes[0].textContent);
        //console.log(AncestorList);
        var outstr ="";
        for (var ii = 0; ii<AncestorList.length; ii++) {
          if (0 == ii) { outstr = AncestorList[ii]; }
          else {outstr = outstr + ", " + AncestorList[ii];}
        }
        document.getElementById("seedTray").innerHTML = outstr;
        //console.log("grid ", GridBox);
      }
      if (target.node.id=="AncestorBoxNode"){
        freezeOrgan.forInSelectedItems(function(item, id){  
          GridBox.insertNodes(false, [item]);          //assign the node that is selected from the only  valid source.
        });
      }
      if (target.node.id=="freezeOrgansimNode"){
        var avidian = prompt("Please name your avidian", nodes[0].textContent+"_1");
        var namelist = dojo.query('> .dojoDndItem', 'freezeOrgansimNode');
        var unique = true;
        while (unique) {
          unique = false;
          for (var ii = 0; ii < namelist.length; ii++){
            //console.log ("name ", namelist[ii].innerHTML);
            if (avidian == namelist[ii].innerHTML) {
              avidian = prompt("Please give your avidian a unique name ", avidian+"_1")
              unique = true;
              break;
            }
          }  
        }
        if (null != avidian) { nodes[0].textContent=avidian; }
        //contextMenu(Object.keys(target.selection)[0], target.node.id); //either this line or the next seem to work; don't need both
        contextMenu(nodes[0].id, target.node.id);

        //console.log("map: ", target.map);
        //console.log("id: ", target.node.id);
        //console.log("textContent: ", nodes[0].textContent);
        //console.log("nodes[0].id: ", nodes[0].id);
        //console.log("target.selection: ",target.selection);
        //console.log("target.selection: ",Object.keys(target.selection)[0]);
        //console.log(document.getElementById(Object.keys(target.selection)[0]).innerHTML)
        //console.log("allnodes: ",target.getAllNodes());
      }
      if (target.node.id=="freezePopDishNode"){
        var items = getAllItems(freezePopDish);
        var popDish = prompt("Please name your populated dish", nodes[0].textContent+"_1");
        var namelist = dojo.query('> .dojoDndItem', 'freezePopDishNode');
        var unique = true;
        while (unique) {
          unique = false;
          for (var ii = 0; ii < namelist.length; ii++){
            if (avidian == namelist[ii].innerHTML) {
              popDish = prompt("Please give your populated dish a unique name ", popDish+"_1")
              unique = true;
              break;
            }
          }  
        }
        if (null!=popDish) { 
          nodes[0].textContent=popDish;
          //to change data value not fully tested, but keep as it was hard to figure out
          //freezePopDish.setItem(target.node.id, {data: popDish, type: ["popDish"]});
        }
        contextMenu(nodes[0].id, target.node.id);
        //contextMenu(Object.keys(target.selection)[0], target.node.id);  //gets original rather than new node 
      }
        if (source.node.id =="pop1name"){
          pop1a = [];       //remove lines from population 1
          pop1b = [];
          AnaChartFn();
        }
        if (source.node.id =="pop2name"){
          pop2a = [];       //remove lines from population 2
          pop2b = [];
          AnaChartFn();
        }
        if (source.node.id =="pop3name"){
          pop3a = [];       //remove lines from population 3
          pop3b = [];
          AnaChartFn();
        }
      });

    function graphPop1Change(){
      //console.log("sel", graphPop1.selection);
      //console.log("sel", Object.keys(target.selection)[0]);
      //console.log("sel", document.getElementById(Object.keys(graphPop1.selection)[0]).innerHTML);  //only works when something is selected
      var items = getAllItems(graphPop1);
      //if there is an existing item, need to clear all nodes and assign most recent to item 0
      if (1 < items.length) {
        graphPop1.selectAll().deleteSelectedNodes();  //does appear to clear items  
        graphPop1.sync();   //not sure if this helps or not
        freezePopDish.forInSelectedItems(function(item, id){  
          graphPop1.insertNodes(false, [item]);          //assign the node that is selected from the only  valid source.
        });
        graphPop1.sync();
        var items = getAllItems(graphPop1);
      }
      
      console.log("textcontent ", graphPop1.node.textContent);  //use to get textContent which is what will be paired with actual data
      //console.log("iditems ", items._parent[0].id);
      console.log("id ", graphPop1.node.childNodes[0].id);

      //example code to set item programatically. not actually needed here.
      //graphPop1.setItem(graphPop1.node.childNodes[0].id, {data: "test_name", type: ["popDish"]});
      //graphPop1.sync();

      //this works for demo purposes only. We will be using textContent rather than data
      pop1a = dictPlota[items[0].data];
      pop1b = dictPlotb[items[0].data];
      AnaChartFn();
    };
    dojo.connect(graphPop1, "onDrop", graphPop1Change);

    function graphPop2Change(){
      var items = getAllItems(graphPop2);
      //need to clear all nodes and assign most recent to item 0
      if (1 < items.length) {
        graphPop2.selectAll().deleteSelectedNodes();  //does appear to clear items  
        graphPop2.sync();   
        freezePopDish.forInSelectedItems(function(item, id){  
          graphPop2.insertNodes(false, [item]);          //assign the node that is selected from the only  valid source.
        });
        graphPop2.sync(); 
        var items = getAllItems(graphPop2);
      }
      console.log("textcontent ", graphPop2.node.textContent);  //use to get textContent which is what will be paired with actual data
      //this works for demo purposes only. We will be using textContent rather than data
      pop2a = dictPlota[items[0].data];
      pop2b = dictPlotb[items[0].data];
      AnaChartFn();
    };
    dojo.connect(graphPop2, "onDrop", graphPop2Change);

    function graphPop3Change(){
      var items = getAllItems(graphPop3);
      //need to clear all nodes and assign most recent to item 0
      if (1 < items.length) {
        graphPop3.selectAll().deleteSelectedNodes();  //does appear to clear items  
        graphPop3.sync();   //not sure if this helps or not
        freezePopDish.forInSelectedItems(function(item, id){  
          graphPop3.insertNodes(false, [item]);          //assign the node that is selected from the only  valid source.
        });
        graphPop3.sync();
        items = getAllItems(graphPop3);
      }
      console.log("textcontent ", graphPop3.node.textContent);  //use to get textContent which is what will be paired with actual data
      pop3a = dictPlota[items[0].data];
      pop3b = dictPlotb[items[0].data];
      AnaChartFn();
    };
    dojo.connect(graphPop3, "onDrop", graphPop3Change);

    /* ********************************************************************** */
    /* Right Click Context Menu Freezer ************************************* */
    /* ********************************************************************** */

    // I think all the code in this section can be deleted as it is not used.
    var pMenu;
    var freezerItemID ="Configuration";  //id of a freezer item need to get from dnd assignments
    freezerItemID = "dojoUnique1";
    
    dojo.addOnLoad(function() {
      pMenu = new dijit.Menu({ targetNodeIds: [freezerItemID]});
      pMenu.addChild(new dijit.MenuItem({
        label: "Simple menu item",
        onClick: function() {
          var gmenu = prompt("Please rename your freezer item", "george");
        }
      }));
    });

    /* *************************************************************** */
    /* Population page script ******************************************/
    /* *************************************************************** */
    // shifts the population page from Map (grid) view to setup parameters view and back again.
    function popBoxSwap(){
      if ("Map"== document.getElementById("PopSetupButton").innerHTML ) {
        dijit.byId("mapBlock").set("style", "display: block;");
        dijit.byId("setupBlock").set("style", "display: none;");
        document.getElementById("PopSetupButton").innerHTML = "Setup";
      } else {
        document.getElementById("PopSetupButton").innerHTML = "Map";
        dijit.byId("setupBlock").set("style", "display: block;");
        dijit.byId("mapBlock").set("style", "display: none;");
      }
    }
    document.getElementById("PopSetupButton").onclick = function(){popBoxSwap();};

    // hides and shows the population and selected organsim data on right of population page with "Stats" button
    var popStatFlag = true;
    document.getElementById("PopStatsButton").onclick = function(){
      if (popStatFlag) {
        popStatFlag = false;
        registry.byId("popRight").domNode.style.width = "1px";
        registry.byId("mainBC").layout();  
        dijit.byId("popRight").set("style", "display: block; visibility: visible;");

      }
      else {
        popStatFlag = true;
        registry.byId("selectOrganPane").domNode.style.width = "150px";
        registry.byId("popRight").domNode.style.width = "395px";
        registry.byId("mainBC").layout();  
        dijit.byId("popRight").set("style", "display: block; visibility: visible;");

      }
    };

    /* *************************************************************** */
    /* ******* Map Grid buttons ************************************** */
    /* *************************************************************** */
    var newrun = true;
    var ave_fitness = [];
    var ave_gestation_time = [];
    var ave_metabolic_rate = [];
    var population_size = [];
    dijit.byId("mnPause").attr("disabled", true);
    
    function runPopFn(){
      //check for ancestor organism in configuration data
      var namelist = dojo.query('> .dojoDndItem', 'AncestorBoxNode');
      if (1>namelist.length){
        document.getElementById("runStopButton").innerHTML="Run";
        dijit.byId("mnPause").attr("disabled", true);
        dijit.byId("mnRun").attr("disabled", false);
        NeedAncestorDialog.show();
      }
      else { // setup for a new run by sending config data to avida
        if (newrun) {
          newrun = false;  //the run will no longer be "new"
          //collect setup data to send to C++
          var setDict={};
          setDict["sizex"]=dijit.byId("sizex").get('value');
          setDict["sizey"]=dijit.byId("sizey").get('value');
          setDict["muteInput"]=document.getElementById("muteInput").value;
          var nmlist = [];
          for (var ii=0; ii<namelist.length; ii++){
            nmlist.push(namelist[ii].innerHTML);
          }
          setDict["ancestor"] = nmlist;
          if (dijit.byId("childParentRadio").get('checked')){
            setDict["birthMethod"]=0}
          else {
          setDict["birthMethod"]=1}
          setDict["notose"]=dijit.byId("notose").get('checked');
          setDict["nanose"]=dijit.byId("nanose").get('checked');
          setDict["andose"]=dijit.byId("andose").get('checked');
          setDict["ornose"]=dijit.byId("ornose").get('checked');
          setDict["orose"]=dijit.byId("orose").get('checked',true);
          setDict["andnose"]=dijit.byId("andnose").get('checked',true);
          setDict["norose"]=dijit.byId("norose").get('checked',true);
          setDict["xorose"]=dijit.byId("xorose").get('checked',true);
          setDict["equose"]=dijit.byId("equose").get('checked',true);
          setDict["repeatMode"]=dijit.byId("experimentRadio").get('checked',true);
          //dijit.byId("manRadio").set('checked',true); 
           
          var setjson = dojo.toJson(setDict);
          //console.log("setjson ", setjson);   
        }  
        //DataManagerRead();
        doRunPause();
      }
      //update screen based on data from C++
    }
 
    //sends message to worker to tell Avida to run/pause as a toggle. 
    //uiWorker function
    function doRunPause() {
       var request = {
          'Key':'RunPause'
       };
       uiWorker.postMessage(request);
    }

    //Dummy Data 
    var dataManDict={}
    dataManDict["core.world.update"]=1;
    //var dataManJson = dojo.toJson(dataManDict);
    //var DataManJson = JSON.stringify(dataManDict) //does the same thing as dojo.toJason
    //console.log("man ", dataManJson);
    //console.log("str ", DataManJson);

    function updatePopStats(msg){
        document.getElementById("TimeLabel").textContent = msg["core.update"].formatNum(0);
        document.getElementById("popSizeLabel").textContent = msg["core.world.organisms"].formatNum(0);
        document.getElementById("aFitLabel").textContent = msg["core.world.ave_fitness"].formatNum(2);
        document.getElementById("aMetabolicLabel").textContent = msg["core.world.ave_metabolic_rate"].formatNum(1);
        document.getElementById("aGestateLabel").textContent = msg["core.world.ave_gestation_time"].formatNum(1);
        document.getElementById("aAgeLabel").textContent = msg["core.world.ave_age"].formatNum(2);
        document.getElementById("notPop").textContent = msg["core.environment.triggers.not.test_organisms"];
        document.getElementById("nanPop").textContent = msg["core.environment.triggers.nand.test_organisms"];
        document.getElementById("andPop").textContent = msg["core.environment.triggers.and.test_organisms"];
        document.getElementById("ornPop").textContent = msg["core.environment.triggers.orn.test_organisms"];
        document.getElementById("oroPop").textContent = msg["core.environment.triggers.or.test_organisms"];
        document.getElementById("antPop").textContent = msg["core.environment.triggers.andn.test_organisms"];
        document.getElementById("norPop").textContent = msg["core.environment.triggers.nor.test_organisms"];
        document.getElementById("xorPop").textContent = msg["core.environment.triggers.xor.test_organisms"];
        document.getElementById("equPop").textContent = msg["core.environment.triggers.equ.test_organisms"];
        //update graph arrays
        ave_fitness.push(msg["core.world.ave_fitness"]); 
        ave_gestation_time.push(msg["core.world.ave_gestation_time"]);
        ave_metabolic_rate.push(msg["core.world.ave_metabolic_rate"]);
        population_size.push(msg["core.world.organisms"]);
        popChartFn();
    }
    
    //from http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
    Number.prototype.formatNum = function(c, d, t){
    var n = this, 
        c = isNaN(c = Math.abs(c)) ? 2 : c, 
        d = d == undefined ? "." : d, 
        t = t == undefined ? "," : t, 
        s = n < 0 ? "-" : "", 
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
        j = (j = i.length) > 3 ? j % 3 : 0;
       return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
     };

    //process the run/Stop Button - a separate function is used so it can be flipped if the message to avida is not successful. 
    document.getElementById("runStopButton").onclick = function(){runStopFn()}
    function runStopFn(){
      if ("Run"==document.getElementById("runStopButton").innerHTML) {
        document.getElementById("runStopButton").innerHTML="Pause";
        dijit.byId("mnPause").attr("disabled", false);
        dijit.byId("mnRun").attr("disabled", true);
        runPopFn();
      } else {
        document.getElementById("runStopButton").innerHTML="Run";
        dijit.byId("mnPause").attr("disabled", true);
        dijit.byId("mnRun").attr("disabled", false);
        doRunPause()
        //console.log("pop size ", population_size);
      }
    };

    //Same as above but for drop down menu
    dijit.byId("mnRun").on("Click", function(){ 
        dijit.byId("mnPause").attr("disabled", false);
        dijit.byId("mnRun").attr("disabled", true);
        document.getElementById("runStopButton").innerHTML="Pause";
        runPopFn();
    });

    dijit.byId("mnPause").on("Click", function(){ 
        dijit.byId("mnPause").attr("disabled", true);
        dijit.byId("mnRun").attr("disabled", false);
        document.getElementById("runStopButton").innerHTML="Run";
        doRunPause()
    });
    
    /* ************** New Button and new Dialog ***********************/    
    dijit.byId("newDiscard").on("Click", function(){
      newDialog.hide();
      resetDishFn();
      //console.log("newDiscard click");
    }); 

    dijit.byId("newSave").on("Click", function(){
      newDialog.hide();
      resetDishFn();
      FrPopulationFn();
      //console.log("newSave click");
    }); 

    function newButtonBoth(){
      if (newrun) {// reset petri dish
        resetDishFn();
      }
      else {// check to see about saving current population
        newDialog.show();
      }
    }
    document.getElementById("newDishButton").onclick = function(){newButtonBoth()};
    dijit.byId("mnNewpop").on("Click", function(){newButtonBoth()});
    
    //uiWorker function
    function doReset() {
      var request = {
        'Key':'Reset'
      };
      uiWorker.postMessage(request);
    }
    
    function resetDishFn() { //Need to reset all settings to @default
      newrun = true;
      // send rest to Avida adaptor
      doReset();
      //set run/stop and drop down menu to the 'stopped' state
      dijit.byId("mnPause").attr("disabled", true);
      dijit.byId("mnRun").attr("disabled", false);
      document.getElementById("runStopButton").innerHTML="Run";
      //set configuation to default
      ConfigCurrent.selectAll().deleteSelectedNodes();  
      ConfigCurrent.insertNodes(false, [{ data: "@default",      type: ["conDish"]}]);
      ConfigCurrent.sync();
      //clear the time series graphs
      ave_fitness = [];
      ave_gestation_time = [];
      ave_metabolic_rate = [];
      population_size = [];
      popChartFn();
      //reset values in population  settings either based on a 'file' @default or a @default string
      writeSettings();
    }

    //writes data to Environmental Settings page based on the content of ConfigCurrent
    //for now this is hard coded to what would be in @default. will need a way to request data from C++
    //and read the returned json string. 
    function writeSettings(){
      dijit.byId("sizex").set('value','60');
      dijit.byId("sizey").set('value','60');
      document.getElementById("muteInput").value='2';
      var event = new Event('change');
      document.getElementById("muteInput").dispatchEvent(event);
      AncestorBox.selectAll().deleteSelectedNodes();
      AncestorBox.sync();
      GridBox.selectAll().deleteSelectedNodes();
      GridBox.sync();
      AncestorList = [];
      TimeLabel.textContent = 0;
      document.getElementById("seedTray").innerHTML="";
      dijit.byId("childParentRadio").set('checked',true);
      dijit.byId("notose").set('checked',true);
      dijit.byId("nanose").set('checked',true);
      dijit.byId("andose").set('checked',true);
      dijit.byId("ornose").set('checked',true);
      dijit.byId("orose").set('checked',true);
      dijit.byId("andnose").set('checked',true);
      dijit.byId("norose").set('checked',true);
      dijit.byId("xorose").set('checked',true);
      dijit.byId("equose").set('checked',true);
      dijit.byId("experimentRadio").set('checked',true);
      dijit.byId("manRadio").set('checked',true);
      //Selected Organism Type
      document.getElementById("nameLabel").textContent="-";
      document.getElementById("fitLabel").innerHTML="-";
      document.getElementById("metabolicLabel").textContent="-";
      document.getElementById("generateLabel").textContent="-";
      document.getElementById("ageLabel").textContent="-";
      document.getElementById("ancestorLabel").textContent="-";
      document.getElementById("notLabel").textContent="not-";
      document.getElementById("nanLabel").textContent="nan-";
      document.getElementById("andLabel").textContent="and-";
      document.getElementById("ornLabel").textContent="orn-";
      document.getElementById("antLabel").textContent="ant-";
      document.getElementById("norLabel").textContent="nor-";
      document.getElementById("xorLabel").textContent="xor-";
      document.getElementById("equLabel").textContent="equ-";
      document.getElementById("notTime").textContent="0";
      document.getElementById("nanTime").textContent="0";
      document.getElementById("andTime").textContent="0";
      document.getElementById("ornTime").textContent="0";
      document.getElementById("antTime").textContent="0";
      document.getElementById("norTime").textContent="0";
      document.getElementById("xorTime").textContent="0";
      document.getElementById("equTime").textContent="0";
      //Population Statistics
      document.getElementById("popSizeLabel").textContent="-";
      document.getElementById("aFitLabel").textContent="-";
      document.getElementById("aMetabolicLabel").textContent="-";
      document.getElementById("aGestateLabel").textContent="-";
      document.getElementById("aAgeLabel").textContent="-";
      document.getElementById("notPop").textContent="-";
      document.getElementById("nanPop").textContent="-";
      document.getElementById("andPop").textContent="-";
      document.getElementById("ornPop").textContent="-";
      document.getElementById("oroPop").textContent="-";
      document.getElementById("antPop").textContent="-";
      document.getElementById("norPop").textContent="-";
      document.getElementById("xorPop").textContent="-";
      document.getElementById("equPop").textContent="-";
    }

    //******* Freeze Button ********************************************
    document.getElementById("freezeButton").onclick = function(){
      fzDialog.show();
    }
    
    function FrConfigFn(){
      var fzName = prompt("Please name the new configuration", "newConfig");
      var namelist = dojo.query('> .dojoDndItem', "freezeConfigureNode");
      var unique = true;
      while (unique) {
        unique = false;
        for (var ii = 0; ii < namelist.length; ii++){
          //console.log ("name ", namelist[ii].innerHTML);
          if (fzName == namelist[ii].innerHTML) {
            fzName = prompt("Please give your new configuration a unique name ", fzName+"_1")
            unique = true;
            break;
          }
        }  
      }
      if (null!=fzName) {
        freezeConfigure.insertNodes(false, [ {data: fzName,   type: ["conDish"]}]);
        freezeConfigure.sync();
      }
    }
    
    dijit.byId("FzConfiguration").on("Click", function(){
      fzDialog.hide();
      FrConfigFn();
    }); 
    
    dijit.byId("mnConfig").on("Click", function(){ FrConfigFn() });
    
    function FrPopulationFn(){
      var fzName = prompt("Please name the new population", "newPopulation");
      var namelist = dojo.query('> .dojoDndItem', "freezePopDishNode");
      var unique = true;
      while (unique) {
        unique = false;
        for (var ii = 0; ii < namelist.length; ii++){
          //console.log ("name ", namelist[ii].innerHTML);
          if (fzName == namelist[ii].innerHTML) {
            fzName = prompt("Please give your new Population a unique name ", fzName+"_1")
            unique = true;
            break;
          }
        }  
      }
      if (null!=fzName) {
        freezePopDish.insertNodes(false, [ {data: fzName,   type: ["popDish"]}]);
        freezePopDish.sync();
      }
    }

    dijit.byId("FzPopulation").on("Click", function(){
      fzDialog.hide();
      FrPopulationFn();
    }); 
    
    dijit.byId("mnPopulation").on("Click", function() {FrPopulationFn() });

    /* *************************************************************** */
    /* ******* Population Setup Buttons, etc.  *********************** */
    /* *************************************************************** */
    function popSizeFn() {
      //console.log("in popSizeFn");
      //console.log(dijit.byId("sizex"));
      var xx = Number(document.getElementById("sizex").value);
      var yy = Number(document.getElementById("sizey").value);
      //console.log("x is " + xx + "; y=" + yy);
      document.getElementById("sizexy").innerHTML = "is a total of " + xx * yy + " cells";
    }

    dijit.byId("sizex").on("Change", popSizeFn);
    dijit.byId("sizey").on("Change", popSizeFn);
    //console.log("after size");

    $(function slidemute() {
      /* because most mutation rates will be less than 2% I set up a non-linear scale as was done in the Mac Avida-ED */
      /* the jQuery slider I found only deals in integers and the fix function truncates rather than rounds, */
      /* so I multiplied by 100,000 to get 100.000% to come out even. */
      //console.log("before defaultslide value");
      var muteSlideDefault = 109861.   /* results in 2% as a default */
      var muteDefault = (Math.pow(Math.E, (muteSlideDefault/100000))-1).toFixed(3)
      var slides = $( "#muteSlide" ).slider({
        // range: "min",   /*causes the left side of the scroll bar to be grey */
        value: muteSlideDefault,
        min: 0.0,
        max: 461512,
        slide: function( event, ui ) {
          $( "#mRate" ).val( ui.value);  /*put slider value in the text above the slider */
          $( "#muteInput" ).val( (Math.pow(Math.E, (ui.value/100000))-1).toFixed(3));  /*put the value in the text box */
        }
      });
      /* initialize */
      $( "#mRate" ).val( ($( "#muteSlide").slider( "value" )));
      $( "#muteInput" ).val(muteDefault);
      /*update slide based on textbox */
      $( "#muteInput" ).change(function() {
        slides.slider( "value", 100000.0*Math.log(1+(parseFloat(this.value))) );
        $( "#mRate" ).val( 100000*Math.log(1+(parseFloat(this.value))) );
        //console.log("in mute change");
      });
    });
    
    /* --------------------------------------------------------------- */
    /*                    Population Chart                             */
    /* --------------------------------------------------------------- */
    
    //need to get the next two values from real data. 
    //var popY = [1, 1, 1, 2, 2, 2, 4, 4, 4, 8,8,8,14,15,16,16,16,24,24,25,26,36,36,36,48,48]; /
    var popY = [];
    var ytitle = dijit.byId("yaxis").value;
    var popChart = new Chart("popChart");
    
    //use theme to change grid color based on tick color http://stackoverflow.com/questions/6461617/change-the-color-of-grid-plot-dojo
    //this required the use of a theme, but I'm no longer using the theme. Could take 'Wetland' out of require statemet as long a this is not used
    //var myTheme = Wetland; // Or any other theme
    //myTheme.axis.majorTick.color = "#CCC";  //grey
    //myTheme.axis.minorTick.color = "red";
    
    function popChartFn(){
      if ("Average Fitness" == dijit.byId("yaxis").value) {popY = ave_fitness;}
      else if ("Average Fitness" == dijit.byId("yaxis").value) {popY = ave_fitness;}
      else if ("Average Gestation Time" == dijit.byId("yaxis").value) {popY = ave_gestation_time;}
      else if ("Average Metabolic Rate" == dijit.byId("yaxis").value) {popY = ave_metabolic_rate;}
      else if ("Number of Organisms" == dijit.byId("yaxis").value) {popY = population_size;}
      //popChart.setTheme(myTheme);
      popChart.addPlot("default", {type: "Lines"});
      //popChart.addPlot("grid",{type:"Grid",hMinorLines:false});  //if color not specified it uses tick color.
      // grid info from https://dojotoolkit.org/reference-guide/1.10/dojox/charting.html
      popChart.addPlot("grid", {type:Grid, hMajorLines: true, majorHLine: {color: "#CCC", width: 1}, 
                                          vMajorLines: true, majorVLine: {color: "#CCC", width: 1}});

      popChart.addAxis("x", {fixLower: "major", fixUpper: "major",title:'Time (updates)', titleOrientation: 'away', titleGap: 2,
                             titleFont: "normal normal normal 8pt Arial", font: "normal normal normal 8pt Arial"});
      //popChart.addAxis("y", {vertical: true, title: ytitle, titleFont: "normal normal normal 8pt Arial", titleOrientation: 'axis',
      popChart.addAxis("y", {vertical: true, 
                    fixLower: "major", fixUpper: "major", min: 0, font: "normal normal normal 8pt Arial", titleGap: 4,});
      popChart.addSeries("Series y", popY, {stroke: {color:"blue", width: 2}});   
      popChart.resize(domGeometry.position(document.getElementById("popChartHolder")).w-10, 
                    domGeometry.position(document.getElementById("popChartHolder")).h-15);
      popChart.render();
    };
    popChartFn();
   
    //Set Y-axis title and choose the correct array to plot
    dijit.byId("yaxis").on("Change", function(){
      ytitle = dijit.byId("yaxis").value;
      //need to get correct array to plot from freezer
      popChartFn();
    });
    
    /* *************************************************************** */
    /* Organism page script *********************************************/
    /* *************************************************************** */
    /* **** Organism Setup Dialog */

    document.getElementById("OrgSetting").onclick = function(){
      OrganSetupDialog.show();
    }
    
    //process button to hide or show Organism detail panal. 
    var DetailsFlag = true;
    document.getElementById("OrgDetailsButton").onclick = function(){
      if (DetailsFlag) {
        DetailsFlag = false;
        dijit.byId("rightDetail").set("style", "display: none;");
        registry.byId("rightDetail").domNode.style.width = "1px";
        registry.byId("mainBC").layout();  
      }
      else {
        DetailsFlag = true;
        dijit.byId("rightDetail").set("style", "display: block; visibility: visible;");
        registry.byId("rightDetail").domNode.style.width = "180px";
        registry.byId("mainBC").layout();  
      }
    };

    $(function slideOrganism() {
      /* because most mutation rates will be less than 2% I set up a non-linear scale as was done in the Mac Avida-ED */
      /* the jQuery slider I found only deals in integers and the fix function truncates rather than rounds, */
      /* so I multiplied by 100,000 to get 100.000% to come out even. */
      //console.log("before defaultslide value");
      var muteSlideDefault = 109861.   /* results in 2% as a default */
      var muteDefault = (Math.pow(Math.E, (muteSlideDefault/100000))-1).toFixed(3)
      var slides = $( "#orMuteSlide" ).slider({
        // range: "min",   /*causes the left side of the scroll bar to be grey */
        value: muteSlideDefault,
        min: 0.0,
        max: 461512,
        slide: function( event, ui ) {
          //$( "#orMRate" ).val( ui.value);  /*put slider value in the text near slider */
          $( "#orMuteInput" ).val( (Math.pow(Math.E, (ui.value/100000))-1).toFixed(3) + "%");  /*put the value in the text box */
        }
      });
      /* initialize */
      //$( "#orMRate" ).val( ($( "#orMuteSlide").slider( "value" )));
      $( "#orMuteInput" ).val(muteDefault+"%");
      /*update slide based on textbox */
      $( "#orMuteInput" ).change(function() {
        slides.slider( "value", 100000.0*Math.log(1+(parseFloat(this.value))) );
        //$( "#orMRate" ).val( 100000*Math.log(1+(parseFloat(this.value))) );
        //console.log("in mute change");
      });
    });

    /* ****************************************************************/
    /*                  Canvas for Organsim (genome) view
    /* ************************************************************** */
    //initialize globals needed to hold Organism Trace Data
    var traceObj; 
    var cycle=0;
    //initialize all canvases needed for Organism page
    var bufferCvs = document.getElementById("buffer");
    var bufferCtx = bufferCvs.getContext("2d");
    bufferCtx.translate(0.5, 0.5);
    var registerCvs = document.getElementById("register");
    var registerCtx = registerCvs.getContext("2d");
    registerCtx.translate(0.5, 0.5);
    var AstackCvs = document.getElementById("Astack");
    var AstackCtx = AstackCvs.getContext("2d");
    AstackCtx.translate(0.5, 0.5);
    var BstackCvs = document.getElementById("Bstack");
    var BstackCtx = BstackCvs.getContext("2d");
    BstackCtx.translate(0.5, 0.5);
    var outputCvs = document.getElementById("output");
    var outputCtx = outputCvs.getContext("2d");
    //outputCtx.imageSmoothingEnabled= false;
    var OrgCanvas = document.getElementById("organismCanvas");
    var ctx = OrgCanvas.getContext("2d");
    ctx.translate(0.5, 0.5);  //makes a crisper image
    //initialize gen (genome) object. 
    var gen = {};
    gen.bigR = [120, 120]; //radius of full circle
    gen.size = [50, 50];
    gen.smallR = gen.bigR*2*Math.PI/(2*gen.size[0]); //radius of each small circle
    gen.tanR = gen.bigR[0]-gen.smallR;         //radius of circle tanget to inside of small circles
    gen.pathR = gen.bigR[0]-3*gen.smallR;      //radius of circle used to define reference point of arcs on path
    gen.headR = [gen.bigR[0]-2*gen.smallR,gen.bigR[1]-2*gen.smallR];      //radius of circle made by center of head positions.
    gen.cx = [150, 350];  //center of main circle x
    gen.cy = [150, 150];  //center of main circle y
    gen.fontsize = Math.round(1.8*gen.smallR);
    gen.rotate = [0, 0];  //used to rotate offspring 180 degrees when growing; otherwise no rotation.
    gen.dna = ["",""];

    function DrawTimeline(width, height) {
      var startX, lineY, endY, length, cycles;
      var upTickX = [];
      var upTickY = [];
      var upNumY = [];
      var dnTickX = [];
      var dnTickY = [];
      var dnNumY = [];
      var txtWide = 3;
      
      lineY = OrgCanvas.height-height/2;
      startX = 5;
      endX = OrgCanvas.width-5;
      ctx.beginPath();
      
    }

    function drawBitStr (context, row, bitStr) {
      var recWidth = 5;   //The width of the rectangle, in pixels
      var recHeight = 5;  //The height of the rectangle, in pixels
      var xx; //The x-coordinate of the upper-left corner of the rectangle
      var yy = row*recHeight;    //upper-left corner of rectangle
      var str = "1";
      var color; 
      for (var ii = 0; ii < bitStr.length; ii++){
        xx = ii*(recWidth);
        //draw outline of rectangle
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = orgColorCodes["outline"];
        context.rect(xx, yy, recWidth, recHeight);
        context.stroke();
        //fill in rectangle
        context.beginPath();
        str = bitStr.substr(ii,1);
        if ("0" == str) {context.fillStyle = orgColorCodes["0"];}
        else {context.fillStyle = orgColorCodes["1"];}
        context.fillRect(xx, yy, recWidth, recHeight);
        context.fill();
        //draw black lines every so many bits
        if (0 == ii%4) {
          context.beginPath();
          context.lineWidth = 1;
          context.strokeStyle = dictColor["Black"];
          context.moveTo(xx,yy);
          context.lineTo(xx,yy+recHeight);
          context.stroke();
        }
        //console.log("fs=", context.fillStyle, "; xx=", xx, "; yy=", yy, "; w=", recWidth, "; h=", recHeight, 
        //            "; bitStr=",str, "; out=",context.strokeStyle);
      }
    }

    function genomeCircle(gen, gg){
      var SmallCenterX, SmallCenterY;  //center of small circle
      var txtW;      // width of txt
      for (var ii = 0; ii < gen.dna[gg].length; ii++){
        SmallCenterX = gen.cx[gg] + gen.bigR[gg]*Math.cos(ii*2*Math.PI/gen.size[gg]+gen.rotate[gg]);
        SmallCenterY = gen.cy[gg] + gen.bigR[gg]*Math.sin(ii*2*Math.PI/gen.size[gg]+gen.rotate[gg]);
        ctx.beginPath();
        ctx.arc(SmallCenterX, SmallCenterY, gen.smallR, 0, 2*Math.PI);
        //ctx.fillStyle = letterColor[gen.dna[gg].substr(ii,1)];  //use if gen.dna is a string
        ctx.fillStyle = letterColor[gen.dna[gg][ii]];  //use if gen.dna is an array
        ctx.fill();   //required to render fill
        ctx.fillStyle = dictColor["Black"];
        ctx.font = gen.fontsize+"px Arial";
        //txtW = ctx.measureText(gen.dna[gg].substr(ii,1)).width;  //use if gen.dna is a string
        txtW = ctx.measureText(gen.dna[gg][ii]).width;     //use if gen.dna is an array
        //console.log("r=", gen.smallR, "; W=", txtW);
        //ctx.fillText(gen.dna[gg].substr(ii,1),SmallCenterX-txtW/2, SmallCenterY+gen.smallR/2);  //use if gen.dna is a string
        ctx.fillText(gen.dna[gg][ii],SmallCenterX-txtW/2, SmallCenterY+gen.smallR/2);
        //console.log("Circle xy: ", SmallCenterX, SmallCenterY);
      }
      //console.log("circle rotate", gen.rotate[gg], " gg=", gg);
    }
    
    function drawHead(gen, spot, gg, head) {
      var hx, hy; //center of head and used as center of ring
      var txtW;  // width of txt
      //draw circumference around instruction that the instruction pointer points to. 
      hx = gen.cx[gg] + gen.bigR[gg]*Math.cos(spot*2*Math.PI/gen.size[gg]+gen.rotate[gg]);
      hy = gen.cy[gg] + gen.bigR[gg]*Math.sin(spot*2*Math.PI/gen.size[gg]+gen.rotate[gg]);
      ctx.beginPath();
      ctx.arc(hx, hy, gen.smallR, 0, 2*Math.PI);
      ctx.strokeStyle = orgColorCodes[head];
      ctx.lineWidth = 1.5;
      ctx.stroke();
      //draw instruction pointer tangent to instruction
      hx = gen.cx[gg] + gen.headR[gg]*Math.cos(spot*2*Math.PI/gen.size[gg]+gen.rotate[gg]);
      hy = gen.cy[gg] + gen.headR[gg]*Math.sin(spot*2*Math.PI/gen.size[gg]+gen.rotate[gg]);
      ctx.beginPath();
      ctx.arc(hx, hy, gen.smallR, 0, 2*Math.PI);
      ctx.fillStyle = orgColorCodes["headFill"];
      ctx.fill();
      ctx.fillStyle = orgColorCodes[head];
      ctx.font = gen.fontsize+"px Arial";
      txtW = ctx.measureText(headCodes[head]).width;
      ctx.fillText(headCodes[head],hx-txtW/2, hy+gen.smallR/2); 
    }

    //Draw arc using Bézier curve and two control points http://www.w3schools.com/tags/canvas_beziercurveto.asp
    function drawArc2(gen, spot1, spot2, rep){ //draw an arc
      var xx1, yy1, xx2, yy2, xc1, yc1, xc2, yc2; 
      ctx.lineWidth = 1;
      if (spot2 >= spot1) {
        ctx.strokeStyle = dictColor["Black"];  //set the line to a color which can also be a gradient see http://www.w3schools.com/canvas/canvas_clock_face.asp
      } else { ctx.strokeStyle = dictColor["Red"];}
      ctx.beginPath();
      xx1 = gen.cx[0] + gen.tanR*Math.cos(spot1*2*Math.PI/gen.size[0]); //Draw line from Spot1
      yy1 = gen.cy[0] + gen.tanR*Math.sin(spot1*2*Math.PI/gen.size[0]);  
      ctx.moveTo(xx1, yy1);
      xx2 = gen.cx[0] + gen.tanR*Math.cos(spot2*2*Math.PI/gen.size[0]); //Draw line to Spot2
      yy2 = gen.cy[0] + gen.tanR*Math.sin(spot2*2*Math.PI/gen.size[0]);  
      //Set Control points on same radial as the spots
      gen.pathR = gen.bigR[0]-(2+rep/3)*gen.smallR;
      xc1 = gen.cx[0] + gen.pathR*Math.cos(spot1*2*Math.PI/gen.size[0]);  
      yc1 = gen.cy[0] + gen.pathR*Math.sin(spot1*2*Math.PI/gen.size[0]);
      xc2 = gen.cx[0] + gen.pathR*Math.cos(spot2*2*Math.PI/gen.size[0]);  
      yc2 = gen.cy[0] + gen.pathR*Math.sin(spot2*2*Math.PI/gen.size[0]);
      //console.log(xc1, yc1, xc2, yc2, xx2, yy2);
      ctx.bezierCurveTo(xc1, yc1, xc2, yc2, xx2, yy2);
      ctx.stroke();
    }
    
    //main function to update the Organism Trace on the Organism Page
    function updateOrgTrace(obj, cycle){
      //set canvas size
      OrgCanvas.width = $("#organismCanvasHolder").innerWidth();-5;
      OrgCanvas.height = $("#organismCanvasHolder").innerHeight()-5;
      //Find size and content of each genome. 
      for (var ii=0; ii < obj[cycle].MemSpace.length; ii++) {
        gen.dna[ii] = obj[cycle].MemSpace[ii].Memory;
        gen.size[ii] = obj[cycle].MemSpace[ii].Memory.length;
      }
      //Draw Timeline
      var timelineHeight = 60;
      DrawTimeline(OrgCanvas.width, timelineHeight);
      //Find radius and center of big circle for each genome
      if (OrgCanvas.height < .55*(OrgCanvas.width-timelineHeight)) {
        gen.bigR[0] = Math.round(0.45*(OrgCanvas.height-timelineHeight)) }//set size based on height
      else {
        gen.bigR[0] = Math.round(0.2*OrgCanvas.width) //set size based on width
      }
      gen.cx[0] = OrgCanvas.width/2 - 1.2*gen.bigR[0];        //center of 1st (parent) circle x
      gen.cy[0] = (OrgCanvas.height-timelineHeight)/2;  //center of 1st (parent) circle y
      // Draw parent (Mom) genome in a circle---------------------------------------- 
      gen.smallR = gen.bigR[0]*2*Math.PI/(2*gen.size[0]); //radius of each small circle
      gen.tanR = gen.bigR[0]-gen.smallR;         //radius of circle tanget to inside of small circles
      gen.pathR = gen.bigR[0]-3*gen.smallR;      //radius of circle used to define reference point of arcs on path
      gen.headR[0] = gen.bigR[0]-2*gen.smallR;      //radius of circle made by center of head positions.
      gen.fontsize = Math.round(1.8*gen.smallR);
      genomeCircle(gen, 0);
      // Draw child (Son) genome in a circle ---------
      if (1 < obj[cycle].MemSpace.length) {
        gen.bigR[1] = gen.smallR*2*gen.size[1]/(2*Math.PI);
        gen.bigR[1] = gen.bigR[1]+gen.bigR[1]/gen.size[1];
        gen.cy[1] = gen.cy[0];
        gen.headR[1] = gen.bigR[1]-2*gen.smallR;      //radius of circle made by center of head positions.
        if (obj[cycle].DidDivide) {
          gen.cx[1] = OrgCanvas.width/2 + 1.1*gen.bigR[1];
          gen.rotate[1] = 0;
        }
        else {
          gen.cx[1] = gen.cx[0] + gen.bigR[0] + 2*gen.smallR + gen.bigR[1];
          gen.rotate[1] = Math.PI;            //offspring rotated 180 degrees when still growing.
          //console.log("xy", gen.cx[1], gen.cy[1], " size", gen.size[0]);
        }
        genomeCircle(gen, 1);
      }
      //Draw path of acrs
      //drawArc(gen, spot1, spot2, rep)
      for (var ii = 0; ii<obj[cycle].Jumps.length; ii++) {
        drawArc2(gen,  obj[cycle].Jumps[ii].FromIDX,  obj[cycle].Jumps[ii].ToIDX, obj[cycle].Jumps[ii].Freq);
      }
      //drawHead(gen, spot, generation, head) // draws the various heads for parent (Mom)
      for (var ii=0; ii < obj[cycle].MemSpace.length; ii++) {
        if (undefined != obj[cycle].MemSpace[ii].Heads.READ) 
          {drawHead(gen, obj[cycle].MemSpace[ii].Heads.READ, ii, "READ");}
        if (undefined != obj[cycle].MemSpace[ii].Heads.WRITE) 
          {drawHead(gen, obj[cycle].MemSpace[ii].Heads.WRITE, ii, "WRITE");}
        if (undefined != obj[cycle].MemSpace[ii].Heads.FLOW) 
          {drawHead(gen, obj[cycle].MemSpace[ii].Heads.FLOW, ii, "FLOW");}
        if (undefined != obj[cycle].MemSpace[ii].Heads.IP) 
          {drawHead(gen, obj[cycle].MemSpace[ii].Heads.IP, ii, "IP");}
      }

      //Draw Buffers ---------------------------------------------------
      //drawBitStr (name, row, bitStr);
      for (var ii = 0; ii < obj[cycle].Buffers.input.length; ii++){
        drawBitStr (bufferCtx, ii, obj[cycle].Buffers.input[ii]);
      }
      drawBitStr (registerCtx, 0, obj[cycle].Registers['AX']);
      drawBitStr (registerCtx, 1, obj[cycle].Registers['BX']);
      drawBitStr (registerCtx, 2, obj[cycle].Registers['CX']);
      //console.log("A", obj[cycle].Buffers);
      for (var ii = 0; ii<2; ii++){ //only showing the top 2 in the stack of 10
        //console.log(ii, obj[cycle].Buffers["stack A"][ii]);
        drawBitStr (AstackCtx, ii, obj[cycle].Buffers["stack A"][ii]);
        }
      for (var ii = 0; ii<2; ii++){ //only showing the top 2 in the stack of 10
        drawBitStr (BstackCtx, ii, obj[cycle].Buffers["stack B"][ii]);
      }
      drawBitStr (outputCtx, 0, obj[cycle].Buffers.output[0]);
      
      // update details 
      updateTimesPerformed(obj, cycle);   //Update Times Functions are performed. 
      writeInstructDetails(obj, cycle);   //Write Instruction Details

      //context.clearRect(0, 0, canvas.width, canvas.height); //to clear canvas see http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
    }
    
    function updateTimesPerformed(obj, cycle){
      document.getElementById("notPerf").textContent = obj[cycle].Functions.not;
      document.getElementById("nanPerf").textContent = obj[cycle].Functions.nand;
      document.getElementById("andPerf").textContent = obj[cycle].Functions.and;
      document.getElementById("ornPerf").textContent = obj[cycle].Functions.orn;
      document.getElementById("oroPerf").textContent = obj[cycle].Functions.or;
      document.getElementById("antPerf").textContent = obj[cycle].Functions.andn;
      document.getElementById("norPerf").textContent = obj[cycle].Functions.nor;
      document.getElementById("xorPerf").textContent = obj[cycle].Functions.xor;
      document.getElementById("equPerf").textContent = obj[cycle].Functions.equ;
      if (0 < obj[cycle].Functions.not) {document.getElementById("notOrg").textContent="0 not+";}
      else {document.getElementById("notOrg").textContent="0 not-";}
      if (0 < obj[cycle].Functions.nand) {document.getElementById("nanOrg").textContent="1 nan+";}
      else {document.getElementById("nanOrg").textContent="1 nan-";}
      if (0 < obj[cycle].Functions.and) {document.getElementById("andOrg").textContent="2 and+";}
      else {document.getElementById("andOrg").textContent="2 and-";}
      if (0 < obj[cycle].Functions.orn) {document.getElementById("ornOrg").textContent="3 orn+";}
      else {document.getElementById("ornOrg").textContent="3 orn-";}
      if (0 < obj[cycle].Functions.or) {document.getElementById("oroOrg").textContent="4 oro+";}
      else {document.getElementById("oroOrg").textContent="4 oro-";}
      if (0 < obj[cycle].Functions.andn) {document.getElementById("antOrg").textContent="5 ant+";}
      else {document.getElementById("antOrg").textContent="5 ant-";}
      if (0 < obj[cycle].Functions.nor) {document.getElementById("norOrg").textContent="6 nor+";}
      else {document.getElementById("norOrg").textContent="6 nor-";}
      if (0 < obj[cycle].Functions.xor) {document.getElementById("xorOrg").textContent="7 xor+";}
      else {document.getElementById("xorOrg").textContent="7 xor-";}
      if (0 < obj[cycle].Functions.equ) {document.getElementById("equOrg").textContent="8 equ+";}
      else {document.getElementById("equOrg").textContent="8 equ-";}
    }
    
    function writeInstructDetails(obj, cycle) {
      var letter;
      var IPspot = obj[cycle].MemSpace[0].Heads.IP
      if (undefined == obj[cycle].MemSpace[0].Memory[IPspot-1]) {
        dijit.byId("ExecuteJust").set("value","(none)"); 
      }
      else {
        letter = obj[cycle].MemSpace[0].Memory[IPspot-1]
        dijit.byId("ExecuteJust").set("value", InstDescribe[letter]);
        //console.log("Inst", InstDescribe[letter]);
      }
      if (undefined == obj[cycle].MemSpace[0].Memory[IPspot]) {
        document.getElementById("ExecuteAbout").textContent = "(none)";
      }
      else {
        letter = obj[cycle].MemSpace[0].Memory[IPspot];
        document.getElementById("ExecuteAbout").textContent = InstDescribe[letter];
      }
      //console.log('spot=', IPspot, ' letter=', letter, " Instr=", InstDescribe[letter]);
    }

    /* ****************************************************************/
    /*             End of Canvas to draw genome and update details
    /* ************************************************************** */

    /* **** Controls bottum of organism page **************************/
    var update_timer = null;

    function outputUpdate(vol) {
      document.querySelector('#orgCycle').value = vol;
    }

    dijit.byId("orgBack").on("Click", function() {
      var ii = Number(document.getElementById("orgCycle").value);
      if (cycleSlider.get("minimum") < cycleSlider.get("value")) {
        ii--;
        dijit.byId("orgCycle").set("value", ii);
        cycle = ii;
        updateOrgTrace(traceObj, cycle)
      }
    });

    dijit.byId("orgForward").on("Click", function() {
      var ii = Number(document.getElementById("orgCycle").value);
      if (cycleSlider.get("maximum") > cycleSlider.get("value")) {
        ii++;
        dijit.byId("orgCycle").set("value", ii);
        cycle = ii;
        updateOrgTrace(traceObj, cycle)
      }
    });

    dijit.byId("orgReset").on("Click", function(){
      dijit.byId("orgCycle").set("value", 0);
      cycle = 0;
      updateOrgTrace(traceObj, cycle);
      orgStopFn()
    });
    
    function orgStopFn() {
      if (update_timer){ clearInterval(update_timer);}
      dijit.byId("orgRun").set("label", "Run");
    }
    
    function orgRunFn(){
      if (cycleSlider.get("maximum") > cycleSlider.get("value")) {
        cycle++;
        dijit.byId("orgCycle").set("value", cycle);
        updateOrgTrace(traceObj, cycle);
      }
      else {orgStopFn();}
    }
    dijit.byId("orgRun").on("Click", function(){
      if ("Run" == dijit.byId("orgRun").get("label")) {
        dijit.byId("orgRun").set("label", "Stop");
        update_timer = setInterval(orgRunFn, 100);
      }
      else { orgStopFn();
      }
    });

    dijit.byId("orgEnd").on("Click", function() {
      dijit.byId("orgCycle").set("value", cycleSlider.get("maximum"));
      cycle = cycleSlider.get("maximum");
      updateOrgTrace(traceObj, cycle);
      orgStopFn()
    });

    dijit.byId("orgCycle").on("Change", function(value){
      cycleSlider.set("value",value);
      cycle = value;
    });

    /* Organism Gestation Length Slider */
    var cycleSlider = new HorizontalSlider({
        name: "cycleSlider",
        value: 0,
        minimum: 0,
        maximum: 200,
        intermediateChanges: true,
        discreteValues:201,
        style: "width:100%;",
        onChange: function(value){
            document.getElementById("orgCycle").value = value;
            cycle = value;
        }
    }, "cycleSlider");
    //console.log("after slider");

    /* ****************************************************************/
    /* Analysis Page **************************************************/
    /* ****************************************************************/
    var dictPlota = {};
    var dictPlotb = {};
    dictPlota["example"] = [1, 2, 1, 2, 2, 3,   2, 3, 3,    4];
    dictPlota["m2w30u1000not"] = [0.6, 1.8, 2, 2, 2.4, 2.7, 3];
    dictPlota["m2w30u1000nand"] = [1, 1, 1.5, 2, 3, 3, 4, 4, 4.5];
    dictPlotb["example"] = [60, 50, 50, 40, 40, 37, 30, 20, 15, 7];
    dictPlotb["m2w30u1000not"] = [70,   68, 60, 50, 50,   47, 40];
    dictPlotb["m2w30u1000nand"] = [80, 70, 75, 60, 50, 50, 40, 40, 30];
    dictPlota["newPopulation"] = [0.5,  1,  2, 1.7,  2, 2.7, 3.2, 3.2];
    dictPlotb["newPopulation"] = [ 65, 50, 50,  47, 40,  37,  32, 22];
    var dictColor = {};
    dictColor["Red"] = "#FF0000";
    dictColor["Green"] = "#00FF00";
    dictColor["Blue"] = "#0000FF";
    dictColor["Magenta"] = "#FF00FF";
    dictColor["Cyan"] = "#00FFFF";
    dictColor["Yellow"] = "#FFFF00";
    dictColor["Purple"] = "#8800FF";
    dictColor["Orange"] = "#FFAA00";
    dictColor["Black"] = "#000000";
    var pop1a = [];
    var pop1b = [];
    var pop2a = [];
    var pop2b = [];
    var pop3a = [];
    var pop3b = [];
    var color1 = dictColor[dijit.byId("pop1color").value];
    var color2 = dictColor[dijit.byId("pop2color").value];
    var color3 = dictColor[dijit.byId("pop3color").value]; 
    var y1title = "Average Fitness";
    var y2title = 'Average Gestation Time'        
    var anaChart = new Chart("analyzeChart");

    function AnaChartFn(){
      anaChart.addPlot("default", {type: "Lines", hAxis:"x", vAxis:"y"});
      anaChart.addPlot("other", {type: "Lines", hAxis: "x", vAxis: "right y"});
      //grid line info on https://dojotoolkit.org/reference-guide/1.10/dojox/charting.html
      anaChart.addPlot("grid", {type:Grid, hMajorLines: true, majorHLine: {color: "#CCC", width: 1}, 
                                          vMajorLines: true, majorVLine: {color: "#CCC", width: 1}});
      anaChart.addAxis("x", {fixLower: "major", fixUpper: "major",title:'Time (updates)', titleOrientation: 'away'});
      anaChart.addAxis("y", {vertical: true, fixLower: "major", title: y1title, titleOrientation: 'axis',fixUpper: "major", min: 0});
      //anaChart.addAxis("top x", {leftBottom: false});
      anaChart.addAxis("right y", {vertical: true, leftBottom: false, min: 0, title:y2title});
      anaChart.addSeries("Series 1a", pop1a, {stroke: {color:color1, width: 2}});   
      anaChart.addSeries("Series 2a", pop2a, {stroke: {color:color2, width: 2}});
      anaChart.addSeries("Series 3a", pop3a, {stroke: {color:color3, width: 2}});
      anaChart.addSeries("Series 1b", pop1b, {plot: "other", stroke: {color:color1, width: .3}});
      anaChart.addSeries("Series 2b", pop2b, {plot: "other", stroke: {color:color2, width: .3}});
      anaChart.addSeries("Series 3b", pop3b, {plot: "other", stroke: {color:color3, width: .3}});
      
      anaChart.resize(domGeometry.position(document.getElementById("chartHolder")).w-10, 
                    domGeometry.position(document.getElementById("chartHolder")).h-15);
      var dZoom = new MouseZoomAndPan(anaChart, "default");
            //https://www.sitepen.com/blog/2012/11/09/dojo-charting-zooming-scrolling-and-panning/  a different zoom method using a window.
      anaChart.render();
    };
    
    /* Chart buttons ****************************************/
    document.getElementById("pop1delete").onclick = function(){ 
      graphPop1.selectAll().deleteSelectedNodes();
      pop1a = [];
      pop1b = [];
      AnaChartFn();
    }
    document.getElementById("pop2delete").onclick = function(){ 
      pop2a = [];
      pop2b = [];
      AnaChartFn();
      graphPop2.selectAll().deleteSelectedNodes();
    }
    document.getElementById("pop3delete").onclick = function(){ 
      pop3a = [];
      pop3b = [];
      AnaChartFn();
      graphPop3.selectAll().deleteSelectedNodes();
    }
    dijit.byId("pop1color").on("Change", function(){
      color1 = dictColor[dijit.byId("pop1color").value];
      AnaChartFn();
    });
    dijit.byId("pop2color").on("Change", function(){
      color2 = dictColor[dijit.byId("pop2color").value];
      AnaChartFn();
    });
    dijit.byId("pop3color").on("Change", function(){
      color3 = dictColor[dijit.byId("pop3color").value];
      AnaChartFn();
    });
    
    //Set Y-axis title and choose the correct array to plot
    dijit.byId("y1select").on("Change", function(){
      y1title = dijit.byId("y1select").value;
      //need to get correct array to plot from freezer
      AnaChartFn();
    });

    dijit.byId("y2select").on("Change", function(){
      y2title = dijit.byId("y2select").value;
      //need to get correct array to plot from freezer
      AnaChartFn();
    });


    /* Canvas Play in gridCanvas *************************************/
    var canvas = document.getElementById("gridCanvas");
    var ctxP = canvas.getContext("2d");
    ctxP.moveTo(0,0);
    ctxP.lineTo(200,100);
    ctxP.stroke();
    ctxP.beginPath();
    ctxP.arc(95,50,40,0,3*Math.PI/2);
    //ctxP.arc(95,50,40,0,2*Math.PI);
    ctxP.stroke();
        
    var letterColor = {};
    letterColor["a"] = "#F9CC65"; //color Meter
    letterColor["b"] = "#EFC461"; //color Meter
    letterColor["c"] = "#E5BC5D"; //color Meter 
    letterColor["d"] = "#59FF71"; //color Meter
    letterColor["e"] = "#55FF6D"; //color Meter
    letterColor["f"] = "#52F768"; //color Meter
    letterColor["g"] = "#BBFF5C"; //color Meter
    letterColor["h"] = "#B4FF59"; //color Meter
    letterColor["i"] = "#ACF655"; //color Meter
    letterColor["j"] = "#A5EC51"; //color Meter 
    letterColor["k"] = "#6EFFEB"; //color Meter
    letterColor["l"] = "#69FAE2"; //color Meter
    letterColor["m"] = "#65F0D8"; //color Meter
    letterColor["n"] = "#61E5CF"; //color Meter
    letterColor["o"] = "#7B8FFF"; //color Meter
    letterColor["p"] = "#7B8FFF"; //color Meter
    letterColor["q"] = "#7084EA"; //color Meter
    letterColor["r"] = "#6C7EE1"; //color Meter
    letterColor["s"] = "#5CDBC5"; //color Meter
    letterColor["t"] = "#58D1BC"; //color Meter
    letterColor["u"] = "#53C6B3"; //color Meter
    letterColor["v"] = "#FF26EE"; //color Meter
    letterColor["x"] = "#ED24DB"; //color Meter
    letterColor["w"] = "#F725E5"; //color Meter
    letterColor["y"] = "#AE2CFF"; //color Meter
    letterColor["z"] = "#9DE14E"; //color Meter
    var orgColorCodes = {};
    orgColorCodes["mutate"] = "#00FF00"; //color Meter green
    orgColorCodes["start"] = "#5300FF"; //color Meter blue - I don't think this is used.
    orgColorCodes["headFill_old"] = "#777777"; //color Meter grey
    orgColorCodes["headFill"] = "#AAAAAA"; //lighter grey
    orgColorCodes["WRITE"] = "#FA0022"; //color Meter  red
    orgColorCodes["READ"] = "#5300FF"; //color Meter  blue
    orgColorCodes["FLOW"] = "#00FF00"; //color Meter  green
    orgColorCodes["IP"] = "#000000"; //color Meter  black
    orgColorCodes["outline"] = "#686868"; //color Meter grey
    orgColorCodes["0"] = "#F5FF00"; //color Meter yellow
    orgColorCodes["1"] = "#AAAAFF"; //lt blue
    var headCodes = {};
    headCodes["READ"] = "R";
    headCodes["WRITE"] = "W";
    headCodes["FLOW"] = "F";
    headCodes["IP"] = "I";
    var InstDescribe = {};
    InstDescribe["a"]="nop-A is a no-operation instruction, and will not do anything when executed. It can, however, modify the behavior of the instruction preceding it (by changing the CPU component that it affects; see also nop-register notation and nop-head notation) or act as part of a template to denote positions in the genome.";
    InstDescribe["b"]="nop-B is a no-operation instruction, and will not do anything when executed. It can, however, modify the behavior of the instruction preceding it (by changing the CPU component that it affects; see also nop-register notation and nop-head notation) or act as part of a template to denote positions in the genome.";
    InstDescribe["c"]="nop-C is a no-operation instruction, and will not do anything when executed. It can, however, modify the behavior of the instruction preceding it (by changing the CPU component that it affects; see also nop-register notation and nop-head notation) or act as part of a template to denote positions in the genome.";
    InstDescribe["d"]="if-n-equ: This instruction compares the BX register to its complement. If they are not equal, the next instruction (after a modifying no-operation instruction, if one is present) is executed. If they are equal, that next instruction is skipped.";
    InstDescribe["e"]="if-less: This instruction compares the BX register to its complement. If BX is the lesser of the pair, the next instruction (after a modifying no-operation instruction, if one is present) is executed. If it is greater or equal, then that next instruction is skipped.";
    InstDescribe["f"]="if-label: This instruction reads in the template that follows it, and tests if its complement template was the most recent series of instructions copied. If so, it executed the next instruction, otherwise it skips it. This instruction is commonly used for an organism to determine when it has finished producing its offspring.";
    InstDescribe["g"]="mov-head: This instruction will cause the IP to jump to the position in memory of the flow-head.";
    InstDescribe["h"]="jmp-head: This instruction will read in the value of the CX register, and the move the IP by that fixed amount through the organism's memory.";
    InstDescribe["i"]="get-head: This instruction will copy the position of the IP into the CX register.";
    InstDescribe["j"]="set-flow: This instruction moves the flow-head to the memory position denoted in the CX register.";
    InstDescribe["k"]="shift-r: This instruction reads in the contents of the BX register, and shifts all of the bits in that register to the right by one. In effect, it divides the value stored in the register by two, rounding down.";
    InstDescribe["l"]="shift-l: This instruction reads in the contents of the BX register, and shifts all of the bits in that register to the left by one, placing a zero as the new rightmost bit, and truncating any bits beyond the 32 maximum. For values that require fewer than 32 bits, it effectively multiplies that value by two.";
    InstDescribe["m"]="inc: This instruction reads in the content of the BX register and increments it by one.";
    InstDescribe["n"]="dec: This instruction reads in the content of the BX register and decrements it by one.";
    InstDescribe["o"]="pop: This instruction removes the top element from the active stack, and places it into the BX register.";
    InstDescribe["p"]="push: This instruction reads in the contents of the BX register, and places it as a new entry at the top of the active stack. The BX register itself remains unchanged.";
    InstDescribe["q"]="swap-stk: This instruction toggles the active stack in the CPU. All other instructions that use a stack will always use the active one.";
    InstDescribe["r"]="swap: This instruction swaps the contents of the BX register with its complement.";
    InstDescribe["s"]="add: This instruction reads in the contents of the BX and CX registers and sums them together. The result of this operation is then placed in the BX register.";
    InstDescribe["t"]="sub: This instruction reads in the contents of the BX and CX registers and subtracts CX from BX (respectively). The result of this operation is then placed in the BX register.";
    InstDescribe["u"]="nand: This instruction reads in the contents of the BX and CX registers (each of which are 32-bit numbers) and performs a bitwise nand operation on them. The result of this operation is placed in the BX register. Note that this is the only logic operation provided in the basic avida instruction set.";
    InstDescribe["v"]="h-copy: This instruction reads the contents of the organism's memory at the position of the read-head, and copy that to the position of the write-head. If a non-zero copy mutation rate is set, a test will be made based on this probability to determine if a mutation occurs. If so, a random instruction (chosen from the full set with equal probability) will be placed at the write-head instead.";
    InstDescribe["w"]="h-alloc: This instruction allocates additional memory for the organism up to the maximum it is allowed to use for its offspring.";
    InstDescribe["x"]="h-divide: This instruction is used for an organism to divide off a finished offspring. The original organism keeps the state of its memory up until the read-head. The offspring's memory is initialized to everything between the read-head and the write-head. All memory past the write-head is removed entirely.";
    InstDescribe["y"]="IO: This is the input/output instruction. It takes the contents of the BX register and outputs it, checking it for any tasks that may have been performed. It will then place a new input into BX.";
    InstDescribe["z"]="h-search: This instruction will read in the template the follows it, and find the location of a complement template in the code. The BX register will be set to the distance to the complement from the current position of the instruction-pointer, and the CX register will be set to the size of the template. The flow-head will also be placed at the beginning of the complement template. If no template follows, both BX and CX will be set to zero, and the flow-head will be placed on the instruction immediately following the h-search.";

    //Functions not in use, but not ready to trash yet------------------------
    //Draw arc using quadraticCurve and 1 control point http://www.w3schools.com/tags/canvas_quadraticcurveto.asp
    function drawArc1(gen, spot1, spot2, rep){ 
      var xx1, yy1, xx2, yy2, xxc, yyc; 
      ctx.lineWidth = 1;
      if (0 < spot2 - spot1) {
        ctx.strokeStyle = dictColor["Black"];  //set the line to a color which can also be a gradient see http://www.w3schools.com/canvas/canvas_clock_face.asp
      } else { ctx.strokeStyle = dictColor["Red"];}
      ctx.beginPath();
      xx1 = gen.cx[0] + gen.tanR*Math.cos(spot1*2*Math.PI/gen.size[0]); //Draw line from Spot1
      yy1 = gen.cy[0] + gen.tanR*Math.sin(spot1*2*Math.PI/gen.size[0]);  
      ctx.moveTo(xx1, yy1);
      xx2 = gen.cx[0] + gen.tanR*Math.cos(spot2*2*Math.PI/gen.size[0]); //Draw line to Spot2
      yy2 = gen.cy[0] + gen.tanR*Math.sin(spot2*2*Math.PI/gen.size[0]);  
      //Set Control point on line perpendicular to line between Spot1 & spot2
      gen.pathR = gen.bigR-(2+rep)*gen.smallR;
      xxc = gen.cx[0] + gen.pathR*Math.cos(spot2*2*Math.PI/gen.size[0] + (spot1-spot2)*(Math.PI)/gen.size[0]);  
      yyc = gen.cy[0] + gen.pathR*Math.sin(spot2*2*Math.PI/gen.size[0] + (spot1-spot2)*(Math.PI)/gen.size[0]);
      ctx.quadraticCurveTo(xxc, yyc, xx2, yy2);
      ctx.stroke();
    }

  });
