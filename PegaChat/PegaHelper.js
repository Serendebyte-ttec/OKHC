(function () {

    var standardHeight = "550" + "px";
    var initialMessageBoxDivHeight;
    var adjustMessageFieldWidthInterval;
    var missedMessageCounter = 0;
    var minimized = true;
    var chatSessionStatusKey = 'chat-session-connected';
    var proactiveContainer;
    var proactiveTimer = null;

    if(localStorage.getItem("username")=="lisa")
    {

    var PegaChatConfig = {
        "ChannelId": "botafb73adbd305467da67387d7375fd373",
        "HelpConfigurationName": "Provider Chat bot",
        "PegaSSAHelpButtonText": "Need Help?",
        "PegaApplicationName": "TTECHCProviderSelfService",
        "PegaServerURL": "https://den01hc000peg01.lab.local/prweb/PRChat/app/TTECHCProviderSelfService_3342/",
        "SSAWorkClass": "Work-Channel-Chat",
        "ProactiveChatClass": "PegaCA-Work-ProactiveChat",
        "CobrowseToken": "Please enter Co-Browse API token",
        "CoBrowseServerHostURL": "Please enter Co-Browse server URL",
        "ProactiveNotificationEnabled": "true",
        "ProactiveServiceURL": "https://den01hc000peg01.lab.local/prweb/PRRestService/CSSelfServiceNBA/V1/Container",
        "ProactiveNotificationDismiss": "true",
        "ProactiveNotificationDismissTime": "30",
        "CobrowseEnabled": "false"
    };
}else{
    
    
    var PegaChatConfig = {
        "ChannelId": "botf57d0dc492144bfeba5b7852ed9998a5",
        "HelpConfigurationName": "HC Chat bot",
        "PegaSSAHelpButtonText": "Need Help?",
        "PegaApplicationName": "TTECHCDemoSelfService",
        "PegaServerURL": "https://den01hc000peg01.lab.local/prweb/PRChat/app/TTECHCDemoSelfService_2087/",
        "SSAWorkClass": "Work-Channel-Chat",
        "ProactiveChatClass": "PegaCA-Work-ProactiveChat",
        "CobrowseToken": "Please enter Co-Browse API token",
        "CoBrowseServerHostURL": "Please enter Co-Browse server URL",
        "ProactiveNotificationEnabled": "true",
        "ProactiveServiceURL": "https://den01hc000peg01.lab.local/prweb/PRRestService/CSSelfServiceNBA/V1/Container",
        "ProactiveNotificationDismiss": "true",
        "ProactiveNotificationDismissTime": "30",
        "CobrowseEnabled": "false"
    };



}

 

    addDOMEventListener(window, "load", displayLauncher);
    addDOMEventListener(window, "DOMContentLoaded", DOMContentLoadedHandler);

    function appendMashupGadgets(gadgetName) {
        var isProactiveChat = gadgetName === 'ProactiveChat';
        var tempConfig = {};
        if (isProactiveChat) {
            tempConfig.classname = PegaChatConfig.ProactiveChatClass;
            tempConfig.actionParams = setDefaultProactiveChatGadgetParams;
            tempConfig.threadname = 'ProactiveChatThread'
            tempConfig.onpagedata = 'setDynamicProactiveChatGadgetParams',
            tempConfig.oncustom = 'proactiveChatCustomEventHandler'
        } else {
            tempConfig.classname = PegaChatConfig.SSAWorkClass;
            tempConfig.actionParams = setDefaultChatGadgetParams;
            tempConfig.threadname = 'CSAdvisor'
            tempConfig.onpagedata = 'setDynamicChatGadgetParams',
            tempConfig.oncustom = ''
        }
        appendElement("div", "", {
            "id": gadgetName,
            "data-pega-gadgetname": gadgetName,
            "data-pega-action": 'createNewWork',
            "data-pega-action-param-flowname": 'pyStartCase',
            "data-pega-action-param-model": '',
            "data-pega-isdeferloaded": 'true',
            "data-pega-threadname": tempConfig.threadname,
            "data-pega-systemid": 'pega',
            "data-pega-resizetype": 'fixed',
            "data-pega-redirectguests": 'true',
            "data-pega-event-onclose": 'hideinline',
            "data-pega-event-onpagedata": tempConfig.onpagedata,
            "data-pega-action-param-classname": tempConfig.classname,
            "data-pega-applicationname": PegaChatConfig.PegaApplicationName,
            "data-pega-url": PegaChatConfig.PegaServerURL,
            "data-pega-action-param-parameters": tempConfig.actionParams(),
            "data-pega-event-oncustom": tempConfig.oncustom
        });
    }

    function DOMContentLoadedHandler() {
        window.pega = window.pega || {};
        window.pega.chat = window.pega.chat || {};
        window.pega.chat.proactiveChat = new PegaProactiveChat();
        /* checking chat session is connected or not, if it is already connected in some other tab then not showing need help button*/
        if (window.localStorage.getItem(chatSessionStatusKey) == "true") {
            return;
        }

        if (PegaChatConfig.CobrowseEnabled == "true") {
            /* Load the cobrowse assets */
            window.fireflyAPI = {};
            var script = document.createElement("script");
            script.type = "text/javascript";
            fireflyAPI.token = PegaChatConfig.CobrowseToken;
            fireflyAPI.serverHostUrl = PegaChatConfig.CoBrowseServerHostURL;
            script.src = PegaChatConfig.CoBrowseServerHostURL + "/cobrowse/loadScripts";
            script.async = true;
            document.head.appendChild(script);
        }


        addDOMEventListener(window, "message", postMessageListener);
        addDOMEventListener(window, "beforeunload", removeConnectedStatus);

        var $minL = appendElement("div", PegaChatConfig.PegaSSAHelpButtonText, { id: "launcherminimized" });
        addDOMEventListener($minL, "click", maximizeAdvisorWindow);
        appendElement("div", "0", { id: "unreadCounter" }, $minL);
        hideElement("launcherminimized");

        if (PegaChatConfig.ProactiveNotificationEnabled == "true" && sessionStorage.getItem("ProactiveOffered") != "true") {
            /* Check CDH to see if there's an offer to present */
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    processCDHResponse(JSON.parse(this.responseText));
                }
            };

            xhttp.open("POST", PegaChatConfig.ProactiveServiceURL, true);
            xhttp.setRequestHeader("Content-type", "application/json");
            xhttp.send('{"CustomerID" : "' + getCookie("ContactID") + '", "AccountNumber" : "' + getCookie("AccountNumber") + '"}');
        }

        appendMashupGadgets("OnlineHelp");
        appendMashupGadgets("ProactiveChat");
    }


    function removeConnectedStatus() {
        /* removing chatsessionstatus flag on unload*/
        window.localStorage.removeItem(chatSessionStatusKey);
    }

    var headerFontColor = "";
    var headerBackgroundColor = "";
    var textFontColor = "";
    var textFontFamily = "";

    function postMessageListener(event) {

        /* console.log("origin is ",event.origin); 
        console.log("received: "+event.data); */

        try {
            var message = JSON.parse(event.data);
        } catch (e) {
          if(event.data.action == "showkmarticle") {
            showkmarticle(event.data.articleid);
          }
           else{
             console.log("Error parsing posted message: " + e.message);
             return;
           } 
        }
        /* console.log("message is ", message); */

        if (message.message) {
            if ((message.message.payload.name == "loaded" || message.message.payload.name == "confirm") && message.message.src == "OnlineHelpIfr") {
                showElement("OnlineHelpIfr");
            }
        }

        if (message.command == "setChatConnectionStatus") {
            window.localStorage.setItem(chatSessionStatusKey, message.status);
        }
        /* minimize advisor - start */
        if (message.command == "minimizeFromCase") {
            minimizeServiceCaseAdvisor(message);
        }
        if (message.command == "minimizeFromAdvisor") {
            minimizeAdvisor(message);
        }
        /* minimize advisor - end */

        if (message.command == "CSRMessage" || message.command == "SystemMessage") {
            handleMissedMessages();
        }

        if (message.command == "close") {
            hideinline();
        }

        if (message.command == "expand" || message.command == "collapse" || message.command == "compact" || message.command == "standard") {
            handleResize(message.command);
        }

        if (message.command == "setStyles") {
            headerFontColor = message.headerFontColor;
            headerBackgroundColor = message.headerBackgroundColor;
            textFontColor = message.textFontColor;
            textFontFamily = message.textFontFamily;
        }
        if (message.command == 'ProactiveChat') {
            var payload = message.payload || {};
            if (payload.action == 'offer') {
                pega.chat.proactiveChat.offer(payload.queue, payload.metadata, payload.defaultUI);
            } else if (payload.action == 'accept') {
                pega.chat.proactiveChat.accept()
            } else if (payload.action == 'decline') {
                pega.chat.proactiveChat.decline();
            } else if (payload.action == 'setStyles') {
                pega.chat.proactiveChat.setStyles();
            }
        }
        if (message.command == "showLeftPanel" || message.command == "hideLeftPanel") {
            handleLeftPanel(message.command);
        }

        if (message.command == "setAssignmentKey") {
            var isProactiveChatFlag = sessionStorage.getItem('isProactiveChat') == "true";
            !isProactiveChatFlag && sessionStorage.setItem("AssignmentKey", message.pzInsKey);
       			if (!(message.pzInsKey.includes("CHATBOT")))
      				handleLeftPanel("hideLeftPanel");
        }

        if (message.command == "clearProactiveTimer") {
            clearProactiveTimer();
        }

        if (message.command == "downloadBotTranscript") {
            downloadBotTranscript(message.transcript);
        }
    }

    // function adjustMessageFieldWidth() {
    // 	var width = $("#sendMessageField").width();
    // 	if (width != null) {
    // 		setOrgetattr("sendMessageField","style", "width:calc(100% - 60px)!important;");
    // 		window.clearInterval(adjustMessageFieldWidthInterval);
    // 	}
    // }

    function hideinline() {
        if (document.getElementById("OnlineHelp")) {
            removeCSSClass("OnlineHelp", "alerting");
            hideElement('OnlineHelpIfr');
        }
        window.setTimeout(function () { showElement("launcher"); }, 1000);
        pega.web.api.doAction("OnlineHelp", "logoff", "AdvisorLogoff", "@baseclass", null);
    }

    /* load Advisor gadget */
    function InvokeAdvisor(initialSize) {
        /* call end chat to make sure it's a clean start */
        if ((typeof (fireflyChatAPI) != "undefined") && fireflyChatAPI.endChat) {
            fireflyChatAPI.endChat();
        }
        hideElement("launcher");
        if (sessionStorage.getItem("botMinimized") == "true") {
            showElement("launcherminimized");
            minimized = true;
            missedMessageCounter = sessionStorage.getItem("unreadCount");
            document.getElementById("unreadCounter").innerHTML = missedMessageCounter;
            if (missedMessageCounter != "0") {
                showElement("unreadCounter");
            } else {
                hideElement("unreadCounter");
            }
        } else {
            removeCSSClass("OnlineHelp", "expanded");
            if (initialSize == "compact") {
                addCSSClass('OnlineHelp', "compacted");
            } else {
                addCSSClass('OnlineHelp', "standard");
            }
            addCSSClass("OnlineHelp", "alerting");
        }
        var activeAssignment = sessionStorage.getItem("AssignmentKey");
        if (activeAssignment) {
            pega.web.api.doAction("OnlineHelp", "openAssignment", activeAssignment);
        } else {
            pega.web.api.doAction("OnlineHelp", "load");
        }
        sessionStorage.setItem("BotStarted", true);
    }

    window.setDynamicChatGadgetParams = function (name) {
        if (name == "workId") {
            return pega.chat.proactiveChat.workId || "";
        } else if (name == "queue") {
            return pega.chat.proactiveChat.queueName || "";
        } else if (name == "offerClass") {
            if (proactiveContainer && proactiveContainer.ClassName != "")
                return "Case";
            else
                return "";
        } else if (name == "offerName") {
            if (proactiveContainer)
                return proactiveContainer.Label;
            else
                return "";
        } else if (name == "offerBenefits") {
            if (proactiveContainer)
                return proactiveContainer.Benefits;
            else
                return "";
        } else if (name == "caseClass") {
            if (proactiveContainer)
                return proactiveContainer.ClassName;
            else
                return "";
        } else if (name == "caseGreeting") {
            if (proactiveContainer)
                return proactiveContainer.Greeting;
            else
                return "";
        } else if (name == "caseReason") {
            if (proactiveContainer)
                return proactiveContainer.Reason;
            else
                return "";
        } else if (name == "proactiveAccept") {
            if (proactiveContainer)
                return proactiveContainer.AcceptText;
            else
                return "";
        } else if (name == "proactiveDecline") {
            if (proactiveContainer)
                return proactiveContainer.DeclineText;
            else
                return "";
        }
    };

    function setDefaultChatGadgetParams() {
        var PegaAParamObject = preparePegaAParams("OnlineHelp");
        PegaAParamObject.channelId = PegaChatConfig.ChannelId;
        PegaAParamObject.HelpConfigurationName = PegaChatConfig.HelpConfigurationName;
        PegaAParamObject.ProactiveChatId = "[page/function/workId]";
        PegaAParamObject.ProactiveChatQueue = "[page/function/queue]";
        PegaAParamObject.offerClass = "[page/function/offerClass]"; /* Offer, Case or Knowledge */
        PegaAParamObject.offerName = "[page/function/offerName]";
        PegaAParamObject.offerBenefits = "[page/function/offerBenefits]";
        PegaAParamObject.caseClass = "[page/function/caseClass]";
        PegaAParamObject.caseGreeting = "[page/function/caseGreeting]";
        PegaAParamObject.caseReason = "[page/function/caseReason]";
        PegaAParamObject.proactiveAccept = "[page/function/proactiveAccept]";
        PegaAParamObject.proactiveDecline = "[page/function/proactiveDecline]";
        return JSON.stringify(PegaAParamObject);
    }

    window.setDynamicProactiveChatGadgetParams = function (name) {
        if (name == "metadata") {
            return JSON.stringify(convertProactiveMetadata(pega.chat.proactiveChat.metadata));
        } else if (name == "queue") {
            return pega.chat.proactiveChat.queueName || "";
        }
    };
    function setDefaultProactiveChatGadgetParams() {
        var PegaAParamObject = preparePegaAParams("ProactiveChat");
        PegaAParamObject.channelId = PegaChatConfig.ChannelId;;
        PegaAParamObject.HelpConfigurationName = PegaChatConfig.HelpConfigurationName;
        PegaAParamObject.metadata = "[page/function/metadata]";
        PegaAParamObject.queueName = "[page/function/queue]";
        return JSON.stringify(PegaAParamObject);
    }

    function handleResize(command) {
        if (command == "expand") {
            addCSSClass('OnlineHelp', "expanded");
            removeCSSClass('OnlineHelp', "compacted");
            removeCSSClass('OnlineHelp', "standard");
        } else if (command == "compact") {
            addCSSClass('OnlineHelp', "compacted");
            removeCSSClass('OnlineHelp', "expanded");
            removeCSSClass('OnlineHelp', "standard");
        } else {
            addCSSClass('OnlineHelp', "standard");
            removeCSSClass('OnlineHelp', "expanded");
            removeCSSClass('OnlineHelp', "compacted");
        }
    }

    function handleLeftPanel(command) {
        if (command == "showLeftPanel") {
            addCSSClass('OnlineHelp', "showLeftPanel");
            removeCSSClass('OnlineHelp', "hideLeftPanel");
        } else if (command == "hideLeftPanel") {
            addCSSClass('OnlineHelp', "hideLeftPanel");
            removeCSSClass('OnlineHelp', "showLeftPanel");
        }
    }

    /* load preview gadget */
    function displayLauncher() {
        /* checking chat session is connected or not, if it is already connected in some other tab then not showing need help button*/
        if (window.localStorage.getItem(chatSessionStatusKey) == "true") {
            return;
        }

        if (sessionStorage.getItem("BotStarted")) {
            InvokeAdvisor();
        } else {
            var $launcher = appendElement("div", PegaChatConfig.PegaSSAHelpButtonText, { id: "launcher" });
            addDOMEventListener($launcher, "click", InvokeAdvisor);
        }
    }

    function processCDHResponse(Response) {
        if (Response && Response.ContainerList) {
            /* console.log("There is a valid CDH response.");*/
            if (Response.ContainerList[0].RankedResults) {
                /*console.log("There is a valid Ranked result");		*/
                proactiveContainer = Response.ContainerList[0].RankedResults[0];
                /*console.log("Offer details:"+proactiveContainer.ClassName +" "+ proactiveContainer.Greeting +" "+ proactiveContainer.Reason);*/
                InvokeAdvisor("compact");
                if (PegaChatConfig.ProactiveNotificationDismiss == "true") {
                    proactiveTimer = setTimeout(CDHActionTimeout, PegaChatConfig.ProactiveNotificationDismissTime * 1000);
                }
                sessionStorage.setItem("ProactiveOffered", true);
            } /*else
      console.log("There are no results")				*/
        }
    }

    function clearProactiveTimer() {
        if (proactiveTimer) {
            clearTimeout(proactiveTimer);
            proactiveTimer = null;
        }
    }

    function CDHActionTimeout() {
        /*console.log("About to dismiss cdh");*/
        pega.web.api.doAction("OnlineHelp", "setGadgetData", "pyWorkPage.DismissCDH", "true", { callback: function (status) { } });
        minimizeAdvisor();
    }

    function minimizeAdvisor(message) {
        hideElement("launcher");
        removeCSSClass("OnlineHelp", "alerting");
        showElement("launcherminimized");
        hideElement("unreadCounter");
        minimized = true;
        missedMessageCounter = 0;
        sessionStorage.setItem("botMinimized", true);
        sessionStorage.setItem("unreadCount", 0);
    }

    function maximizeAdvisorWindow() {
        addCSSClass("OnlineHelp", "alerting");
        hideElement("launcherminimized");
        minimized = false;
        sessionStorage.setItem("botMinimized", false);
        sessionStorage.setItem("unreadCount", 0);
    }

    function handleMissedMessages() {
        if (minimized == true) {
            missedMessageCounter++;
            document.getElementById("unreadCounter").innerHTML = missedMessageCounter;
            sessionStorage.setItem("unreadCount", missedMessageCounter);
            showElement("unreadCounter");
        }
    }
    /* minimize advisor utilities - end */

    function downloadBotTranscript(message) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(message));
        element.setAttribute('download', "ChatTranscript.txt");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
    
    function showkmarticle(articleId) { 
	    var domain = PegaChatConfig.PegaServerURL.substring(0,PegaChatConfig.PegaServerURL.indexOf("/PRChat"))
      alert("You are attempting to open an article with id " + articleId + ". In order to display this article, update the function 'showkmarticle' to invoke a URL of type " + domain + "/PRServletCustom/help/article/" + articleId + "/{{articletitle}}");
    }

    /* Proactive chat js api - begin */
    window.proactiveChatCustomEventHandler = function (gadgetName, customData) {
        customData = customData || {};
        var message = JSON.parse(customData);
        if (message.command == "ProactiveChatStatus") {
            if (message.status === 'loaded') {
                if (window.pega.chat.proactiveChat.defaultUI) {
                    addCSSClass("ProactiveChat", "alerting");
                }
                triggerProactiveChatEvent('ready', message);
            } else if (message.status === "accepted") {
                triggerProactiveChatEvent(message.status, message);
                window.pega.chat.proactiveChat.workId = message.WorkId;
                sessionStorage.setItem('isProactiveChat', false);
                InvokeAdvisor();
                removeCSSClass("ProactiveChat", "alerting");
            } else if (message.status === "declined") {
                triggerProactiveChatEvent(message.status, message);
                sessionStorage.setItem('isProactiveChat', false);
                removeCSSClass("ProactiveChat", "alerting");
            } else if (message.status === 'not-loaded') {
                removeCSSClass("ProactiveChat", "alerting");
                triggerProactiveChatEvent('not-ready', message);
                sessionStorage.setItem('isProactiveChat', false);
            }
        }
    }
    function triggerProactiveChatEvent(eventName, eventData) {
        window.pega.chat.proactiveChat.trigger('proactivechat-' + eventName, eventData || {});
    }
    function pegaUtilInheritClass(newClass, baseClass) {
        Object.keys(baseClass).forEach(function (classMethod) {
            newClass[classMethod] = baseClass[classMethod];
        });
        Object.keys(baseClass.prototype).forEach(function (instanceMethod) {
            newClass.prototype[instanceMethod] = baseClass.prototype[instanceMethod];
        });
    };
    function PegaUtilEventListener() {
        this.listenerStore = {};
    }
    PegaUtilEventListener.prototype.on = function (eventName, eventListener, context) {
        this.listenerStore[eventName] = this.listenerStore[eventName] || [];
        this.listenerStore[eventName].push({ fn: eventListener, context: context });
        return this;
    }
    PegaUtilEventListener.prototype.off = function (eventName, eventListener) {
        this.listenerStore[eventName] = this.listenerStore[eventName] || [];
        var listeners = this.listenerStore[eventName];
        if (!listeners) return this;
        if (!eventListeners) {
            delete this.listenerStore[eventName];
            return this;
        }
        var listener;
        for (var i = 0; i < listeners.length; i++) {
            listener = listeners[i].fn;
            if (listener === eventListener) {
                listeners.splice(i, 1);
                break;
            }
        }
        if (callbacks.length === 0) {
            delete this.listenerStore[eventName];
        }
        return this;
    }
    PegaUtilEventListener.prototype.trigger = function (eventName) {
        this.listenerStore[eventName] = this.listenerStore[eventName] || [];

        var listeners = this.listenerStore[eventName];
        var args = new Array(arguments.length - 1);

        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }

        if (listeners) {
            listeners = listeners.slice(0);
            for (var i = 0, len = listeners.length; i < len; ++i) {
                listeners[i].fn.apply(listeners[i].context || this, args);
            }
        }
        return this;
    };
    function PegaProactiveChat() {
        PegaUtilEventListener.call(this);
        this.defaultUI = true;
    }
    pegaUtilInheritClass(PegaProactiveChat, PegaUtilEventListener);
    PegaProactiveChat.prototype.offer = function (queueName, metadata, bDefaultUI) {
        
      /* Added the below api call to get the agent availability in queue before triggering proactive chat pop up*/
      
        var request = new XMLHttpRequest();
		    var domain = PegaChatConfig.PegaServerURL.substring(0,PegaChatConfig.PegaServerURL.indexOf("/PRChat"))
		    request.open("GET", domain+"/PRRestService/CSProactiveChatServices/01/GetAgentAvailability/"+queueName, true);
    	  request.setRequestHeader("Content-type", "text/plain");
        var self = this;
		    request.onload = function(){
			      if(this.response === 'true'){
				      self.queueName = queueName;
				      self.defaultUI = bDefaultUI === false ? false : true;
				      self.metadata = metadata || {};
				      addCSSClass("ProactiveChat", "alerting");
				      pega.web.api.doAction("ProactiveChat", "load");
              sessionStorage.setItem('isProactiveChat', true);
			    }
		    }
		    request.send();
      
    }
    PegaProactiveChat.prototype.accept = function () {
        pega.web.api.doAction("ProactiveChat", "setGadgetData", "pyWorkPage.ProactiveChatStatus", 'Accepted by customer', { callback: function (obj) { } });
    }
    PegaProactiveChat.prototype.decline = function () {
        pega.web.api.doAction("ProactiveChat", "setGadgetData", "pyWorkPage.ProactiveChatStatus", 'Declined by customer', { callback: function (obj) { } });
    }
    PegaProactiveChat.prototype.setStyles = function (style) {
        setOrgetattr("ProactiveChat", "style", style);
    }

    function convertProactiveMetadata(metadata) {
        var keys = Object.keys(metadata);
        var customMetadata = [];
        for (var i = 0; i < keys.length; i++) {
            customMetadata.push({
                "Name": keys[i],
                "Value": metadata[keys[i]]
            })
        }
        return { pxResults: customMetadata }
    }

    /* JS Util APIs - Begin */
    function appendElement(tagName, text, attrs, parent) {
        var el = document.createElement(tagName);
        parent = parent || document.body;
        parent.appendChild(el).innerHTML = text;
        attrs = attrs || {};
        for (var attr in attrs) {
            el.setAttribute(attr, attrs[attr]);
        }
        return el;
    }
    function hideElement(elId) {
        if (document.getElementById(elId)) {
            document.getElementById(elId).style.display = "none";
        }
    }
    function showElement(elId) {
        if (document.getElementById(elId)) {
            document.getElementById(elId).style.display = "block";
        }
    }
    function addCSSClass(elId, className) {
        document.getElementById(elId) && document.getElementById(elId).classList && document.getElementById(elId).classList.add(className);
    }
    function removeCSSClass(elId, className) {
        document.getElementById(elId) && document.getElementById(elId).classList && document.getElementById(elId).classList.remove(className);
    }
    function addDOMEventListener(target, eventName, handler) {
        if (window.attachEvent) {
            target.attachEvent("on" + eventName, handler);
        } else if (window.addEventListener) {
            target.addEventListener(eventName, handler);
        }
    }
    function setOrgetattr(elemID, name, value) {
        var elem = elemID && document.getElementById(elemID);
        if (value !== undefined) {
            if (typeof elem.setAttribute !== "undefined") {
                if (value === false) {
                    elem.removeAttribute(name);
                } else {
                    elem.setAttribute(name, value === true ? name : value);
                }
            } else {
                elem[name] = value;
            }
        } else if (typeof elem.getAttribute !== "undefined" &&
            typeof elem[name] !== "boolean") {
            return elem.getAttribute(name);
        } else {
            return elem[name];
        }
    }
    /* JS Util APIs - End */
})();
    //static-content-hash-trigger-YUI