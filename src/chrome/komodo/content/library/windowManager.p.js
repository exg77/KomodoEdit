/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Komodo code.
 * 
 * The Initial Developer of the Original Code is ActiveState Software Inc.
 * Portions created by ActiveState Software Inc are Copyright (C) 2000-2007
 * ActiveState Software Inc. All Rights Reserved.
 * 
 * Contributor(s):
 *   ActiveState Software Inc
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

if (typeof(ko) == 'undefined') {
    var ko = {};
}
ko.windowManager = {
    fixupOpenDialogArgs: function(inargs) {
        var args = inargs.slice(); // make a copy
        args[2] = ko.windowManager.fixupOpenDialogFeatures(inargs[2]);
        return args;
    },

    /**
     * Return a "fixed-up" version of the "features" argument for
     * window.openDialog(). This tweaks the string on Mac OS X to ensure
     * the dialog is *not* opened as a sheet.
     *
     * @param features {String} The features string to fixup. Pass in
     *      null to get a reasonable default.
     */
    fixupOpenDialogFeatures: function(features /* ="" */) {
        if (typeof(features) == "undefined") features = "";
    
// #if PLATFORM == "darwin"
        if (!features) {
            features = "chrome,dialog=no";
        } else if (features.indexOf("dialog") < 0) {
            features = "dialog=no,"+features;
        }
// #endif
        return features;
    },

    /**
     * Open a window if no windows of windowType exist. Otherwise, bring
     * the window of windowType to the front. Parameters for this function
     * are identical to window.openDialog()
     *
     * @param <String> chromeURL
     * @param <String> windowType
     * @param <String> options
     * @param <*> extra arguments for dialog
     * @return <Window>
     */
    openOrFocusDialog: function openDialogUniqueInstance(chromeURI, windowType) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        var existingWindow = wm.getMostRecentWindow(windowType);
        if (existingWindow) {
            existingWindow.focus();
            return existingWindow;
        }
        var newArgs = new Array();
        for (var i = 0; i < arguments.length; i++) {
          if (i == 1) {
            newArgs[i] = '_blank';
          } else {
            newArgs[i] = arguments[i];
          }
        }
        return window.openDialog.apply(window, ko.windowManager.fixupOpenDialogArgs(newArgs));
    },

    /**
     * An alternative version of window.openDialog() that does some fixups
     * that Komodo wants in general.
     */
    openDialog: function(/* ... */) {
        if (arguments.length < 2 || !arguments[2]) {
            arguments[2] = "chrome,dialog=no";
        } else if (arguments[2].indexOf("dialog") < 0) {
            arguments[2] = "dialog=no,"+arguments[2];
        }
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        return window.openDialog.apply(window, args);
    },

    /**
     * return a reference to the main Komodo window
     *
     * @return <Window>
     */
    getMainWindow: function windowManager_getMainWindow() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                        .getService(Components.interfaces.nsIWindowMediator);
        return wm.getMostRecentWindow('Komodo');
    },
    /**
     * return true if this is the only Komodo window open
     *
     * @return <Window>
     */
    lastWindow: function() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        var openWindows = wm.getEnumerator('Komodo');
        openWindows.getNext();
        return !openWindows.hasMoreElements();
    },
    /**
     * Close all open windows (or just children of a given parent window).
     *
     * The normal goQuitApplication function in toolkit does this, but we want
     * to prevent quitting if one of the dialogs prevents shutdown by not
     * closing.
     *
     * @param parent {Window} An optional argument to only close windows
     *      that are children of this window.
     * @return {Boolean} True if windows were successful closed.
     */
    closeAll: function closeAll(parent /* =null */) {
        if (typeof(parent) == 'undefined') parent = null;

        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        try {
            var openWindows = wm.getEnumerator(null);
            do {
                var openWindow = openWindows.getNext();
                if (openWindow && openWindow != window) {
                    if (parent && parent != openWindow.parent) continue;
                    openWindow.close();
                    if (!openWindow.closed) {
                        return false;
                    }
                }
            } while (openWindows.hasMoreElements());
        } catch(e) {
            log.exception(e);
        }
        return true;
    },
    
    closeChildren: function() {
        var me = this.getMainWindow();
        return this.closeAll(me);
    },
    
    isAdditionalWindow: function() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        var openWindows = wm.getEnumerator('Komodo');
        openWindows.getNext();
        return openWindows.hasMoreElements();
    },

    otherWindowHasViewForURI: function(uri) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator);
        try {
            var openWindows = wm.getEnumerator('Komodo');
            do {
                var otherWindow = openWindows.getNext();
                if (otherWindow != window
                    && otherWindow.ko.views.manager.getViewForURI(uri)) {
                    return true;
                }
            } while (openWindows.hasMoreElements());
        } catch(e) {
            log.exception(e);
        }
        return false;
    }
};

// backwards compatibility APIs
var openWindowUniqueInstance = ko.windowManager.openOrFocusDialog;
var openWindowMultipleInstance = window.openDialog;
function windowManager_getMainWindow() { return ko.windowManager.getMainWindow(); }



