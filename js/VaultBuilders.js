/*
   Copyright 2019 Bradley A. Pliam

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


//VaultBuilders.js - first generation applets for the Unitraverse platform

VaultBuilders = {};
VaultBuilders.dlgAcceptInfo = {"currentOp":"invalid"};

function initializeBuiltInApplet(core,responseCallback){
  var wnd = core.getWindowPaneFromIndex(core.getHostPaneIndex());
  core.setMaxWindowSize(wnd,600,-1);
}

function generateListHTML(core,responseCallback){
  var item = core.scopeItem;
  var html = "";
  var titleBarAdj = 0;
  var iter = core.tracker;  //use iterator to detect cyclical iteration patterns
  var len = iter.childCount();
  var curIdString = "";  

  html = "<div class=\"white-mgn\">";
  if(len == 0 && (item.r === 'undefined' || item.r == null || item.r.length < 1))html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  for(var i=0; i < len; i++){
    curIdString = iter.getIdString();
    var label = iter.label();
    if(label.indexOf('[') === 0){
      var re = /(\[\s*[ -x]\s*\])\s*(.)/;
      var match = re.exec(label);
      var cbStr = 'chk-box-unchecked.png';
      if(match[1] === '[x]'){
        cbStr = 'chk-box-checked.png';
      }
      if(match[1] === '[-]'){
        cbStr = 'chk-box-cancelled.png';
      }
      var imageDir = core.getImageDirectoryPath();
      label = "<img class=\"sml-inl-icon\" src=\"" + imageDir + "/" + cbStr + "\"> " + label.substring(match[0].length - 1);
    }
    html += "<div class=\"basic-child-item\" id=\"" + curIdString + "\">" + label;
    if(typeof iter.child(i) === 'object'){
      var imagesDir = core.getImageDirectoryPath();
      html += " <img src=\"" + imagesDir + "/more.png\"/>"; 
    }
    html += "</div><br/>"; 
    SharedGlobal.tic.push(curIdString); 
    iter.next(); 
  } 
  html += getResourceItemsHTML(item);
  html += "</div>";

  var retData = {};
  var appletValues = {};
  appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount();
  appletValues['explicitResourceCount'] = SharedGlobal.tic.getResIdCount();
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return html;
}

function getResourceItemsHTML(item){
  var core = SharedGlobal.core;
  var openItems = core.openItems;
  var groupMode = core.groupMode;
  var groupMap = core.groupMap;
  var imagesDir = core.getImageDirectoryPath();
  var iconFilePath = "";
  var html = "";
  len = 0;
  if(item['r'] !== undefined && item['r'] !== null)len = item['r'].length;
  for(var i=0; i < len; i++){
    var domId = "r_item_" + i + "_" + core.getDrawingInstanceToken();
    iconFilePath = core.getIconFileFromType(item.r[i].type);
    html += "<div class=\"resource-item\" id=\"" + domId + "\"><img class=\"resource-icon\" src=\"" + iconFilePath + "\" width=\"16\" height=\"16\" />"  + item.r[i].ttl;
    if(item.r[i]['id'] != -1 && openItems[item.r[i]['id']])html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/grn-circle.png\"/>";
    if(item.r[i].type === 'url'){
      if(item.r[i].pinned === true)html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/push-pin-stuck.png\" width=\"20\" height=\"16\"/>"; 
      else html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/push-pin-unstuck.png\" width=\"20\" height=\"16\"/>"; 
    }
    if(groupMode){
      var grps = "";
      if(groupMap[item.r[i].id])grps = groupMap[item.r[i].id];
      html += "<img class=\"resource-icon-tight\" src=\"" + imagesDir + "/ismember.png\" /><span class=\"quiet\">{ " + grps + " }</span>";
    }
    html += "</div>";
    SharedGlobal.tic.push(domId,'resource'); 
  }
  return html;
}

function handleBuiltInListKeyDown(e){
  var handled = false;
  var keycode = SharedGlobal.core.getKeycodeFromEvent(e);
  if(keycode === 'Space'){
    var si = SharedGlobal.core.getSelectionInfo();
    if(si.rgn === 'child'){
      var label = si.scopeItem.labs[si.zoneIndex];
      if(label.indexOf('[') == 0){
        var re = /(\[\s*[ -x]\s*\])\s*(.)/;
        var match = re.exec(label);
        var cur = match[1];
        var nu = ''
        var cure = '';
        if(cur === '[ ]'){
          nu = '[x]';
          cure = /\[ \]/;
        }
        if(cur === '[x]'){
          nu = '[-]';
          cure = /\[x\]/;
        }
        if(cur === '[-]'){
          nu = '[ ]';
          cure = /\[-\]/;
        }
        if(nu.length > 0){
          si.scopeItem.labs[si.zoneIndex] = label.replace(cure,nu);
          var idx = SharedGlobal.core.getActivePaneIndex();
          var wnd = SharedGlobal.core.getWindowPaneFromIndex(idx);
          var scrollTop = wnd.mainUserScrollableElmt.scrollTop;
          SharedGlobal.core.requestRedraw(true);
          wnd.mainUserScrollableElmt.scrollTop = scrollTop;
        }
      }
    }
    handled = true;
  }
  return handled;
}

function generateCommaSepListHTML(core,responseCallback){
  var item = core.scopeItem;
  var html = "<div class=\"white-mgn\">";
  html += buildCommaSeparatedList(core);
  html += getResourceItemsHTML(item);
  html += "</div>";
  var retData = {};
  var appletValues = {};
  appletValues.explicitChildCount = SharedGlobal.tic.getNonResIdCount();
  appletValues.explicitResourceCount = SharedGlobal.tic.getResIdCount();
  retData.appletValuesMap = appletValues;
  responseCallback(retData);
  return html;
}

function initializeTwoLevelHierarchy(core,callback,hostPaneIdx,args){
  var apIdx = core.getHostPaneIndex();
  var wnd = core.getWindowPaneFromIndex(core.getHostPaneIndex());
  core.setMaxWindowSize(wnd,600,-1);
}

function generateTwoLevelHierarchyHTML(core,responseCallback){
  var item = core.scopeItem;
  var iter = core.tracker;
  var curIdString = "";
  var html = "";
  var item = core.scopeItem;
  var scopeItemDex = core.scopeItemIndex;
  var child = null;
  var len = iter.childItemCount();
  var btEntry = null;
  DefaultFormat.borderTweaks = [];
  html = "</div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  if(len == 0)html += "<div class=\"spacer-item\">";
  var childIdsArr = core.childIds[scopeItemDex];
  for(var i=0; i < len; i++){
    curIdString = iter.getIdString();
    SharedGlobal.tic.push(curIdString);
    btEntry = {};
    btEntry.hdrContainerId = 'hdr-ctnr-' + curIdString;
    btEntry.hdrItemId = curIdString;
    btEntry.hdrEolId = 'hdr-eol-' + curIdString;
    html += "<div class=\"grp-hdr-pnl\" id=\"hdr-ctnr-" + curIdString + "\"><span class=\"hdr-child-item\" id=\"" + curIdString + "\">" + iter.label() + "</span><span class=\"hdr-eol-mark\" id=\"" + btEntry.hdrEolId + "\"></span></div>";
    html += "<div class=\"nested-child-items-wrapper\">";
    html += "<div class=\"framed-inset-child-item\" id=\"" + 'ctnr-' + curIdString + "\">";
    if(iter.isChildEmpty(false) === false){
      html += buildNestedCommaSeparatedList(iter.down(),btEntry);
    }
    else {
      btEntry.eolId = "eol-" + Number(DefaultFormat.borderTweaks.length).toString();
      DefaultFormat.borderTweaks[DefaultFormat.borderTweaks.length] = btEntry;
    }
    html += "</div></div>"; 
    btEntry.hdrId = 'hdr-' + curIdString;
    btEntry.containerId = 'ctnr-' + curIdString;
    iter.next(); 
  }
  html += "<div class=\"spacer-item\"></div>";
  html += getResourceItemsHTML(item);

  var retData = {};
  var appletValues = {};
  appletValues['isMultiLevel'] = true;
  appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount();
  appletValues['explicitResourceCount'] = SharedGlobal.tic.getResIdCount();
  appletValues['postHTMLInstallAppletInfo'] = {"method":postHTMLInstallForTwoLevelView,"data":{}};
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return html;
}

function generateKeyValuePairHTML(core,responseCallback){
  var item = core.scopeItem;
  var scopeItemDex = core.scopeItemIndex;
  var iter = core.tracker;
  var valueStr = "";
  var keyStr = "";
  var len = iter.childItemCount();
  var idString = "";
  var imagesDir = core.getImageDirectoryPath();
  var html = "";
  if(len == 0)html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  html += "<div class=\"spacer-item\"></div>";
  html += "<br/>";
  var childIdsArr = core.childIds[scopeItemDex];
  for(var i=0; i < len; i++){
    idString = iter.getIdString();
    SharedGlobal.tic.push(idString);
    keyStr = "<span class=\"basic-child-item\" id=\"" + idString + "\">" + iter.label(i) + "</span><img src=\"" + imagesDir + "/kvptr.png\"/>";
    if(iter.isChildEmpty(false) === false){ 
      valueStr = buildKVPairValList(iter.down(),childIdsArr[i]);
    }
    else {
      valueStr = "--";
    } 
    html += "<div class=\"nested-child-items-wrapper\">" + keyStr + valueStr + "</div>";
    iter.next();
  }
  html += getResourceItemsHTML(item);
  var retData = {};
  var appletValues = {};
  appletValues['isMultiLevel'] = true;
  appletValues['explicitChildCount'] = SharedGlobal.tic.getNonResIdCount(); 
  appletValues['explicitResourceCount'] = SharedGlobal.tic.getResIdCount();
  retData['appletValuesMap'] = appletValues;
  responseCallback(retData);
  return html;
}

function buildCommaSeparatedList(core){
  var item = core.scopeItem;
  var parentId = core.scopeItemIndex;
  var html = "";
  var sep = "";
  var iter = core.tracker;
  var len = iter.childCount();
  var curIdString = "";
  if(len == 0)html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  for(var i=0; i < len; i++){
    curIdString = iter.getIdString();
    SharedGlobal.tic.push(curIdString);
    html += sep;
    html += "<span class=\"basic-child-item\" id=\"" + curIdString + "\">" + iter.label() + "</span>"; 
    sep = ",";
    iter.next();
  }
  return html;
}

function buildNestedCommaSeparatedList(iter,btEntry){
  var html = "";
  var item = iter.getScopeItem();
  var len = iter.childCount();
  var sep = ",";
  var curIdString = "";
  var child = null;
  if(len == 0)html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  for(var i=0; i<len; i++){
    curIdString = iter.getIdString();
    SharedGlobal.tic.push(curIdString); 
    if(i == (len - 1)){
      sep = "";
    }
    if(i === 0)btEntry.firstItemId = curIdString;
    html += "<span class=\"basic-child-item\" id=\"" + curIdString + "\">" + iter.label() + sep +  "</span>"; 
    iter.next();
  }
  btEntry.eolId = "eol-" + Number(DefaultFormat.borderTweaks.length).toString();
  DefaultFormat.borderTweaks[DefaultFormat.borderTweaks.length] = btEntry;
  html += "<span class=\"eol-mark\" id=\"" + btEntry.eolId + "\"/>";
  return html;
}

function postHTMLInstallForTwoLevelView(){
  var btInfo = null;
  var wrprElmt = null;
  var frontElmt = null;
  var endElmt = null;
  var box1 = null;
  var boxn = null;
  for(var i=0; i<DefaultFormat.borderTweaks.length; i++){
    btInfo = DefaultFormat.borderTweaks[i];
    frontElmt = document.getElementById(btInfo.firstItemId);
    endElmt = document.getElementById(btInfo.eolId);
    wrprElmt = document.getElementById(btInfo.containerId);
    if(frontElmt && endElmt){
      box1 = frontElmt.getBoundingClientRect();
      boxn = endElmt.getBoundingClientRect();
      if(boxn.top < box1.bottom){
        wrprElmt.style.width = (boxn.right - box1.left + 5) + "px";
      }
    }
    else {
      wrprElmt.style.width = "50px";
    }
    wrprElmt = document.getElementById(btInfo.hdrContainerId);
    endElmt = document.getElementById(btInfo.hdrEolId)
    firstElmt = document.getElementById(btInfo.hdrItemId); 
    boxn = endElmt.getBoundingClientRect();
    box1 = firstElmt.getBoundingClientRect();
    
    if(boxn.top < box1.bottom){
      wrprElmt.style.width = (boxn.right - box1.left) + "px";
    }
  }
}

function buildKVPairValList(iter,parentId){
  var html = "";
  var len = iter.childItemCount();
  if(len == 0)html = "<span class=\"basic-child-item\"> ? </span";
  for(var i=0; i < len; i++){
    if(i != 0)html += ',';
    html += "<span class=\"basic-child-item-soft\"><i>" + iter.label(i) + "</i></span>"; 
  }
  return html;
}

function buildResItemsList(core){
  var html = "";
  var item = core.scopeItem;
  var iter = core.tracker;
  var len = iter.childItemCount();
  var res = null;
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  for(var i=0; i < len; i++){
    res = iter.resource(i);
    html += "<div class=\"resource-item\" id=\"r_item_" + i + "\"><img class=\"resource-icon\" src=\"" + res.icon + "\" width=\"16\" height=\"16\" />"  + res.ttl;
    if(openItems[res.id])html += " <img class=\"resource-icon-tight\" src=\"" + imagesDir + "/grn-circle.png\"/>"; 
    if(groupMode){
      var grps = "";
      if(groupMap[res.id])grps = groupMap[res.id];
      html += "<img class=\"resource-icon-tight\" src=\"" + imagesDir + "/ismember.png\" /><span class=\"quiet\">{ " + grps + " }</span>";
    }
    html += "</div>";
    SharedGlobal.tic.push('r_item_' + i,'resources');
  }
  return html;
}

function generateFreeFormHTML(core,callback){
  var html = "";
  return html;
}


///////// direct delegation containers  //////////////////////////


function generateEnclosingRoundedPaneHTML(headerString,paneId,innerHTML){
  var child = null;
  var html = "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  var tinfo = tinfo = {};
  html += "<div class=\"grp-hdr-inset-pnl\" id=\"rp-hdr-ctnr-" + paneId + "\"><span class=\"hdr-child-item\" id=\"rp-hdr-" + paneId + "\">" + headerString + "</span><span class=\"hdr-eol-mark\" id=\"rp-hdr-eol-" + paneId + "\"></span></div>";
  html += "<div class=\"child-items-pane-wrapper\"><div class=\"child-items-frame\" id=\"" + 'ctnr-' + paneId + "\">";
  if(innerHTML === ""){
    html += "[empty]";   
  }
  else{
    html += innerHTML;
  }
  html += "</div></div>"; 
  html += "<div class=\"spacer-item\"></div>";
  return html;
}

function postHTMLInstallForEnclosingRoundedPanes(paneId){
   var el = document.getElementById('rp-hdr-' + paneId);
   if(el == null)return;
   var hdrBox = el.getBoundingClientRect();
   el = document.getElementById('rp-hdr-eol-' + paneId);
   var hEolBox = el.getBoundingClientRect();
   if(hEolBox.bottom <= hdrBox.bottom){
     el = document.getElementById('ctnr-' + paneId);
     var box = el.getBoundingClientRect();
     var cW = box.width; //cW was ruler-verified and seemed to include border pixels
     var hW = hEolBox.left - hdrBox.left; //fractional portion indicates browser dependent?
     var minW = cW * .70;
     if(hW < minW)hW = minW;
     var numLines = hdrBox.height / 12;
     el = document.getElementById('rp-hdr-ctnr-' + paneId);
     //affecting centering calculation are:
     //    grp-hdr-inset-pnl.padding=4
     //    grp-hdr-inset-pnl.borderWidth=2
     //    child-items-pane-wrapper.margin-left=25
     el.style.left = (((cW - hW) / 2) + 25) + "px";
     el.style.width = (hW - 11) + "px";
     el.style.borderRadius = (numLines * 14) + "px";
   }
}

function generateMinimalListHTML(iter,startPos,endPos){
  var html = "";
  var curIdString = ""; 
  if(startPos == endPos)return html; 
  html = "<div class=\"white-mgn\">";
  var imagesDir = SharedGlobal.core.getImageDirectoryPath();
  if(endPos == startPos)html += "<div class=\"spacer-item\"></div><div class=\"spacer-item\"></div><div class=\"spacer-item\"></div>";
  for(var i=startPos; i < endPos; i++){
    curIdString = iter.getIdString();
    html += "<div class=\"basic-child-item\" id=\"" + curIdString + "\">" + iter.label();
    if(iter.child(i) !== null){
      html += " <img src=\"" + imagesDir + "/more.png\"/>"; 
    }
    html += "</div><br/>"; 
    SharedGlobal.tic.push(curIdString);
    iter.next(); 
  } 
  html += "</div>";
  return html;
}



///////// shared applet functions //////////////////////////

VaultBuilders.doAddNode = function(){
  VaultBuilders.dlgAcceptInfo.currentOp = 'add_node';
  SharedGlobal.core.setSimpleEditMessage('node value');
  SharedGlobal.core.setOnAcceptSimpleEditFunc(VaultBuilders.onAcceptSimpleEditForMultiLevelView);
  SharedGlobal.core.displayCorePopup('simple-edit-pane');
  handled = true;
}

VaultBuilders.doAddChildNode = function(){
  VaultBuilders.dlgAcceptInfo.currentOp = 'add_child';
  SharedGlobal.core.setSimpleEditMessage('node value');
  SharedGlobal.core.setOnAcceptSimpleEditFunc(VaultBuilders.onAcceptSimpleEditForMultiLevelView);
  SharedGlobal.core.displayCorePopup('simple-edit-pane');
  handled = true;
}

VaultBuilders.onAcceptSimpleEditForMultiLevelView = function(value){
  var si = SharedGlobal.core.getSelectionInfo();
  if(si.rgn === 'child'){
    var encodedIdArr = si.pane.tabIdsArr[si.pane.tabIdsPos].split('_');
    var childIndex = encodedIdArr[2];
    var p = SharedGlobal.core.getItemFromBankIndex(encodedIdArr[1]); 
    if(VaultBuilders.dlgAcceptInfo.currentOp === 'add_node'){
      SharedGlobal.core.insertPercept(p,childIndex,value);
    } 
    if(VaultBuilders.dlgAcceptInfo.currentOp === 'add_child'){
      var item = p.c[childIndex];
      if(typeof item === 'string'){
        item = SharedGlobal.core.promoteVaultItemStringToObject(encodedIdArr[1],childIndex,false);
      }
      SharedGlobal.core.insertPercept(item,-1,value);
    }
    SharedGlobal.core.requestRedraw(true);
  }
  else{
    SharedGlobal.core.insertPercept(si.scopeItem,-1,value);
  }
}

VaultBuilders.addNewContextItem = function(label){
  UNTRVS.testCore.doAddContext();
  document.getElementById('se-dialog-single-item').value = label; 
  UNTRVS.testCore.updateSimpleInternal();
};

VaultBuilders.editContextItem = function(pageType){
  UNTRVS.testCore.doEditItem();
  var elmt = document.getElementById('dialog-view');
  for(var i=0; i<elmt.length; i++){
    if(elmt.options[i].value === pageType){
      elmt.options.selectedIndex = i;
    }
  }
  var e = {preventDefault:function(){},stopPropagation:function(){},altKey:false};
  UNTRVS.testCore.updateInternal(e);
}

VaultBuilders.addTextResourceItem = function(title,filename,ext){
  UNTRVS.testCore.doAddTextDoc(new spoofedEvent_test());
  document.getElementById('dialog-doc-title').value = title; 
  document.getElementById('dialog-filename').value = filename;
  document.getElementById('dialog-file-ext').value = ext;
  UNTRVS.testCore.updateInternal();
};

VaultBuilders.addWebResourceItem = function(title,webURI){
  var e = {preventDefault:function(){},stopPropagation:function(){},altKey:false};
  UNTRVS.core.doAddURL(e);
  document.getElementById('url-title-string').value = title; 
  document.getElementById('url-address-string').value = webURI; 
  UNTRVS.testCore.updateInternal();
};


