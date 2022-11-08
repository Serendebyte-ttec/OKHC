
        var clipboard = new Clipboard('.btn');
        clipboard.on('success', function (e) {
            console.log(e);
        });

        clipboard.on('error', function (e) {
            console.log(e);
        });
   

  
        //Connect CCP Integration
        var spanCounter = 0;
        var entireTranscript = "";
        var ws;
        var container = document.getElementById("ccpContainer");
        var instanceAlias = alias;
        var agentName;
        var table;
        var contactId;
        var connectionId;
        var credentials;
        var loginURL = `https://${instanceAlias}.awsapps.com/connect/login`;
        var ccpURL = `https://${alias}.awsapps.com/connect/ccp-v2/softphone`;
        var loginWindow;
        var isChat = true;
        var fromLanguage;
        var customerLanguage;
        const fromLanguageDict = {
            "en-US": "en",
            "es-US": "es"
        };

        window.ccp = window.ccp || {};
        window.connect = window.connect || {};
        window.agentChatSession = window.agentChatSession || {};
        window.contact = window.contact || {};

        connect.core.initCCP(container, {
            ccpUrl: ccpURL,
            loginPopup: false,
            region: getRegion(),
            softphone: {
                allowFramedSoftphone: true,
                disableRingtone: false
            }
        });

        connect.core.getEventBus().subscribe(connect.EventType.ACK_TIMEOUT, function () {
            try {
                connect.getLog().warn("ACK_TIMEOUT occurred, attempting to pop the login page.");
                var width = 500;
                var height = 600;
                var left = (screen.width / 2) - (width / 2);
                var top = (screen.height / 2) - (height / 2);

                loginWindow = window.open(loginURL, true, "width=" + width + ",height=" + height +
                    ",menubar=no,status=no,toolbar=no,left=" + left + ",top=" + top);
            } catch (e) {
                connect.getLog().error(
                    "ACK_TIMEOUT occurred but we are unable to open the login popup." + e).withException(
                    e);
            }

            connect.core.getEventBus().subscribe(connect.EventType.ACKNOWLEDGE, function () {
                closeLoginWindow();
            });

        });

        function closeLoginWindow() {
            loginWindow.close();
        }

        connect.agent((agent) => {
            window.ccp.agent = agent;
        });


        var c;
        connect.contact(function (contact) {
            console.log("Contact Type: " + contact.getType());
            if (contact.getType() === "chat") {
                isChat = true;
                $('#chat-section-agent').show();
                $('#chat-section-main').show();
                $('#voice-section-agent').hide();
                $('#voice-section-main').hide();
            } else {
                isChat = false;
                $('#chat-section-agent').hide();
                $('#chat-section-main').hide();
                $('#voice-section-agent').show();
                $('#voice-section-main').show();
            }

            c = contact;
            c.onConnecting(function (c) {
                sendMetrics();
                contactId = contact.contactId;
                var attr = c.getAttributes();
                document.getElementById("contactId").value = c.contactId;

                if (!isChat) {
                    customerLanguage = fromLanguageDict[attr.languageCode.value];
                    console.log("Customer Language: " + customerLanguage + " / " + attr.languageCode.value);
                }
                const aid = attr.aid.value;
                const sak = attr.sak.value;
                const sst = attr.sst.value;
                const reg = getRegion();

                try {
                    AWS.config.update({
                        accessKeyId: aid, secretAccessKey: sak, sessionToken: sst, region: reg
                    });
                    AWS.config.credentials.get(function (err) {
                        if (err)
                            console.log(err);
                        else {
                            credentials = AWS.config.credentials;
                            if (!isChat) {
                                console.log("kicking off websocket test");
                                WebSocketTest(getWebSocket());
                                console.log("websocket test success");
                            }
                        }
                    });
                } catch (e) {
                    console.log(e);
                }
            });

            c.onRefresh((c) => {
                console.log(`contact refreshed`);
                fillTable(c.getAttributes());
            });

            c.onConnected(() => {
                console.log("the contact is connected! " + contact);
                if (!isChat) {
                    //build the relationship between the connectionId and the contactId
                    sendMessage(contactId, connectionId);
                } else {
                    window.contact = contact;
                    window.agentConnection = contact.getAgentConnection();
                    console.log(agentConnection.connectionId);

                    contact.getAgentConnection().getMediaController().then( function(controller) {
                        console.log(controller);
                        agentChatSession = controller;
                    });

                    var attributes = {
                        previousAgent: window.ccp.agent.getConfiguration()["username"]
                    };

                    updateContactAttributes(attributes);

                    getEvents(contact);
                }

            });

            c.onDestroy(() => {
                console.log("clearing");
                if (isChat) {
                    $("#clearChat").click();
                }
            });

        });

        // Reset form after agent becomes available again
        connect.agent((agent) => {
            agent.onStateChange((event) => {
                if (event.newState === 'Available') {
                    if (!isChat) {
                        try {
                            //write the transcripts to S3 an update the attributes with sentinment analysis
                            getOverallSentiment(' ', $('#voiceTranslateLang').val(), true);
                            getSentiment('', $('#voiceTranslateLang').val(), true);
                        } catch (e) {
                            console.log(e);
                        }

                        try {
                            //close the websockets
                            if (ws) {
                                console.log('closing websockets');
                                ws.close();
                                console.log('closed websockets');
                            }
                        } catch (e) {
                            console.log('error closing websockets');
                            console.log(e);
                        }

                        document.getElementById("transcript-text").innerHTML = "";
                        document.getElementById("transcript-text-entities").innerHTML = "";
                        document.getElementById("translated-text").innerHTML = "";
                        $('.attributes').DataTable().clear().draw();
                        spanCounter = 0;
                        document.getElementById('updateNameIMG').src = "assets/sync.svg";
                        $('#imgCurrentSentiment').attr('src',
                            'https://d2nmrh4p02w3u5.cloudfront.net/assets/04_ico_emoji_neutral.svg');
                        bar.animate(0);
                        bar1.animate(0);
                        $("#section-agent").hide("slide");
                        $(".agentActionLabel").innerHTML = "";
                    }
                }
            });
        });

        // --------------- Chat Related Functions -----------------
        $(document).ready((a) => {
            $("#sendChat").click(() => {
                sendChat();
            });

            $('#agentResponseValue').keydown(function(event) {
                if (event.which == 13) {
                    sendChat();
                }
            });

            $("#clearChat").click(() => {
                $("#chatTable tr").remove();
                bar.animate(0);
                bar1.animate(0);
                var imgNeutral = 'https://d2nmrh4p02w3u5.cloudfront.net/assets/sentimentIcons/svg/04_ico_emoji_neutral.svg';
                $('#imgCurrentSentimentChat').attr('src', imgNeutral);
                $('.attributes').DataTable().clear().draw();
                $("#section-agent").hide("slide");
                $(".agentActionLabel").innerHTML = "";
            });
        });

        function processChatText(chatText, messageType) {
            console.log("In the processChatText function");
            if (messageType == "CHAT_ENDED") {
                $('#chatTable').append(`<tr><td class="messageContent endMessage"><b>Chat has ended</b></td></tr>`);
                return;
            }

            var agentLanguage = $('#chatTranslateLang').val();

            detectCustomerLanguageAndTranslateMessage(chatText, agentLanguage);
        }

        function getEvents(contact) {
            contact.getAgentConnection().getMediaController().then(controller => {
                controller.onMessage(messageData => {
                    console.log(messageData);
                    if (messageData.chatDetails.participantId === messageData.data.ParticipantId) {
                        agentName = messageData.data.DisplayName;
                        console.log(`Agent ${messageData.data.DisplayName} Says`,
                            messageData.data.Content)
                    } else {
                        customerName = messageData.data.DisplayName;
                        console.log(
                            `Customer ${messageData.data.DisplayName} Says`,
                            messageData.data.Content);

                        console.log("going to process the chat text now");
                        processChatText(messageData.data.Content, messageData.data.Type);
                    }
                })
            })
        }

        // ---------------------- Voice Related Functions -----------------------------
        function WebSocketTest(wsHost) {
            if ("WebSocket" in window) {
                console.log("WebSocket is supported by your Browser!");
                var url = document.createElement('a');
                url.href =  wsHost;
                var sigv4 = getSignedUrl(url.hostname, url.pathname, getRegion(), credentials)
                ws = new WebSocket(sigv4);

                // Let us open a web socket
                ws.onopen = function(evt) {
                    // Web Socket is connected, send data using send() to get the connectionId
                    console.log("Connection opened : ", evt);
                    sendDummyMessage();
                    console.log("Connected to Websocket...");
                };

                ws.onmessage = function (evt) {
                    console.log(new Date(), ' Message received from WS');
                    if (evt.data.includes("connectionId")) {
                        var d = JSON.parse(evt.data);
                        connectionId = d.connectionId;
                        return;
                    } else {
                        var dt = evt.data.split('@');
                        var st = dt[0];
                        var bool = dt[1];
                        var currentSegId = dt[2];
                        if(spanCounter==0){
                            spanCounter ++;
                            $('#transcript-text').append(" <span " + "id='transSpan" + currentSegId +  "' class='transcript-row'></span>");
                            $('#transcript-text-entities').append(" <span " + "id='transEntitiesSpan" + currentSegId +  "' class='transcript-row'></span>");
                        }
                        processText(st,bool,currentSegId);
                    }

                };

                ws.onclose = function() {
                    // websocket is closed.
                    console.log("Connection is closed...", event);
                    console.log('Onclose called, code is : ' , event.code, ' reason is ' , event.reason , ' wasClean  is' , event.wasClean);
                    if (event.code == 1006 && event.wasClean == false) {
                        console.log("Connection is closed due to connectivity issue");
                    }
                };
            } else {
                // The browser doesn't support WebSocket
                console.log("WebSocket NOT supported by your Browser!");
            }
        }

        $(document).ready((a) => {
            table = $('.attributes').DataTable({
                columns: [{
                        title: "Name"
                    },
                    {
                        title: "Value"
                    }
                ],
                paging: false,
                info: false,
                searching: false
            });
            table.draw();
            $(".showAttributes").click(() => {
                $('.visibleAttributes').show();
                $('.hiddenAttributes').hide();
            });
            $(".hideAttributes").click(() => {
                $('.visibleAttributes').hide();
                $('.hiddenAttributes').show();
            });


            $("#showEntities").click(() => {
                $('#transcript1').show();
                $('#transcript').hide();
            });

            $("#showKeyPhrases").click(() => {
                $('#transcript1').hide();
                $('#transcript').show();
            });
        });

        function sendDummyMessage(){
            console.log("sending dummy request");
            var message = new Object();
            message.action = "newcall";
            message.data="connId@1234|contactId@1234";
            console.log(message);
            var data = JSON.stringify(message);
            console.log(data);
            ws.send(data);
            console.log("Message is sent...");
        }

        function sendMessage(contactId, connectionId){
            console.log("sending new connection id");
            var message = new Object();
            message.action = "sendmessage";
            message.data = "conndId@" + connectionId + "|contactId@" + contactId;
            console.log(message);
            var data = JSON.stringify(message);
            console.log(data);
            ws.send(data);
            console.log("Message is sent...");
        }

        var fillTable = (attributes) => {
            table.clear();
            for (var k in attributes) {
                var value = attributes[k].value;
                if (value.startsWith("http")) {
                    value = '<a target="_blank" href="' + value + '">' + value + '</a>'
                }
                var hideAttributes = ['aid', 'sak', 'sst', 'lexTranscript', 'chatTranscript'];
                if (!hideAttributes.includes(k)) {
                    table.row.add([k, value]);
                }
            }
            table.draw();
        };

        function processText(text, isPartial, segID){
            var space = " ";
            var language = customerLanguage;

            if(isPartial === "false"){
                translateToDifferentLanguage(text, customerLanguage);
                getKeyPhrases(text, language).then(resultText => {
                    $("#transSpan" + segID).html(resultText);
                });
                getEntities(text, language, segID);
                getSentiment(text, language, false);
                getOverallSentiment(text, language, false);
                spanCounter=0;
            }
            $("#transSpan" + segID).html(text);
            $("#transEntitiesSpan" + segID).html(text);
        }

        function translateToDifferentLanguage(source, fromLanguage) {
            var lang = $('#voiceTranslateLang').val();
            console.log('Translating from: ' + fromLanguage + ' to: ' + lang);
            var translate = new AWS.Translate();
            var params = {
                SourceLanguageCode: fromLanguage,
                TargetLanguageCode: lang,
                Text: source
            };
            translate.translateText(params, function(err, data) {
                if (err)
                    console.log(err, err.stack); // an error occurred
                else{
                    $('#translated-text').append(" <span class='translate-row'>" + data.TranslatedText + "</span>");
                }
            });
        }

        // UpdateContact Attributes with overall sentiment and transcript text
        function updateContactAttributes(attributes){
            try{
                const awsconnect = new AWS.Connect();
                attributes.sst = '';
                attributes.sak  = '';
                attributes.aid  = '';
                var i = getInstanceId();
                var params = {
                    Attributes: attributes,
                    InitialContactId: contactId,
                    InstanceId: i
                };
                awsconnect.updateContactAttributes(params, function (err, res) {
                    console.log("we are about to update the record");
                    console.log(params);
                    if (err) {
                        console.log("Error updating contact attributes : ", err);
                    } else {
                        console.log("Updated contact attributes: ", JSON.stringify(res));
                    }
                });
            }catch(e){
                console.log('Error updating contact attributes : ', e);
            }

        }
   
        //-----------------Translate to Different Language---------------------------
        function detectCustomerLanguageAndTranslateMessage(message, toLanguage) {
            var fromLanguage = "en";
            var comprehend = new AWS.Comprehend();
            var text = message;
            while (text.length < 20) {
                text = text + " " + text;
            }

            var params = {
                Text: text
            };

            comprehend.detectDominantLanguage(params, function(err, data) {
                if (err) {
                    console.log("Cannot detect language: " + err, err.stack);
                } else {
                    console.log("Language detection successful");
                    if (data.Languages.length < 1) {
                        console.log("Unable to determine the language. Translating with the default langauge of " + fromLanguage);
                    } else {
                        fromLanguage = data.Languages[0].LanguageCode;
                        if (data.Languages[0].Score < 1.85) {
                            customerLanguage = fromLanguage;
                            console.log("The confidence score is less than 85%. Translating from " + fromLanguage);
                        } else {
                            languageDetected = true;
                            customerLanguage = fromLanguage;
                            console.log("The confidence score is greater than 85%. Translating from " + fromLanguage);
                        }
                    }
                    translateCustomerMessage(message, fromLanguage, toLanguage);
                }
            });
        }

        function translateCustomerMessage(text, fromLanguage, toLanguage) {
            var translate = new AWS.Translate();
            var params = {
                SourceLanguageCode: fromLanguage ? fromLanguage : "en", /* required */
                TargetLanguageCode: toLanguage, /* required */
                Text: text
            };

            translate.translateText(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    $('#tableDescription').hide();
                    $('#chatTable').append(`<tr class="customerMessageName messageParticipant"><td>${customerName}</td></tr><tr class="customerMessage"><td class="customerMessage messageContent"><span>${text}</span></td></tr>`);
                } else{
                    getKeyPhrases(data.TranslatedText, $('#chatTranslateLang').val()).then(finalText => {
                        //getEntities(chatText);
                        getSentiment(data.TranslatedText, $('#chatTranslateLang').val(), false);
                        getOverallSentiment(data.TranslatedText, $('#chatTranslateLang').val(), false);
                        $('#tableDescription').hide();
                        $('#chatTable').append(`<tr class="customerMessageName messageParticipant"><td>${customerName}</td></tr><tr class="customerMessage"><td class="customerMessage messageContent"><span>${finalText}</span></td></tr>`);
                    });
                }
            });
        }

        function sendChat() {
            var message = document.getElementById("agentResponseValue").value;
            console.log("Clicked with message " + message);

            // translate message
            var agentLanguage = $('#chatTranslateLang').val();
            customerLanguage = customerLanguage ? customerLanguage : "en";
            translateAndSendAgentMessage(message, agentLanguage, customerLanguage);
            document.getElementById("agentResponseValue").value = "";
        }

        function translateAndSendAgentMessage(text, fromLanguage, toLanguage) {
            agentName = agentName ? agentName : "Agent";
            var translate = new AWS.Translate();
            var params = {
                SourceLanguageCode: fromLanguage,
                TargetLanguageCode: toLanguage,
                Text: text
            };

            translate.translateText(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                } else {
                    console.log(data);
                }
                args = {
                    message: err ? text : data.TranslatedText,
                    contentType: "text/plain"
                };
                agentChatSession.sendMessage(args);
                $('#tableDescription').hide();
                $('#chatTable').append(`<tr class="agentMessageName messageParticipant"><td>${agentName}</td><tr class="agentMessage"><td class="agentMessage messageContent"><span>${text}</span></td></tr>`);
            });
        }

        // -------- Comprehension ----------
        // For Chat, run comprehension on the agent language.
        // For Voice, run comprehension on the customer language.

        function getKeyPhrases(txt, language) {
            return new Promise(function (resolve, reject) {
                var comprehend = new AWS.Comprehend();
                var originalText = txt;
                var params = {
                    LanguageCode: language,
                    Text: txt
                };
                comprehend.detectKeyPhrases(params, function (err, data) {
                    if (err) {
                        console.log("an error happened in the detectKeyPhrases" + err, err.stack); // an error occurred
                    } else {
                        if (data.KeyPhrases) {
                            data.KeyPhrases.forEach(function (element) {
                                var action = getAgentAction(originalText, element.Text);
                                var tmp = createKeyPhrasesSpanWithColors(element.Text, action);
                                txt = txt.replace(element.Text, tmp);
                            });
                        }
                        resolve(txt);
                    }
                });
            });
        }

        // Only used for Voice
        function getEntities(txt, language, segment){
            var comprehend = new AWS.Comprehend();
            var params = {
                LanguageCode: language,
                Text: txt
            };

            comprehend.detectEntities(params, function(err, data) {
                if (err) {
                    console.log("an error happened in the detectEntities" + err, err.stack); // an error occurred
                } else {
                    if (data.Entities){
                        data.Entities.forEach(function(element){
                            //console.log(element);
                            var tmp = createEntitiesSpanWithColors(element.Type, element.Text, element.Score);
                            txt = txt.replace(element.Text, tmp);
                        });

                    }
                    $("#transEntitiesSpan" + segment).html(txt);
                    $('.awsui-tooltip-trigger').tipsy({
                        gravity : 'n',
                        fade : true
                    });
                }
            });
        }

        function createKeyPhrasesSpanWithColors(text,action){
            var newKeyPhrasesSpan =
                '<span><awsui-tooltip class="entity_word line_color_key_phrases initialized="true"><span><span class="awsui-tooltip-trigger" awsui-tooltip-region="trigger" original-title="' +
                action + '">' + text + '</span></span></awsui-tooltip></span>';
            return newKeyPhrasesSpan;
        }
        
        function createEntitiesSpanWithColors(entity, text, score){
            var m = parseFloat(score * 100).toFixed(2);
            var newEntitiesSpan = '<span><awsui-tooltip class="entity_word line_color_' + entity.toLowerCase() + ' initialized="true"><span><span class="awsui-tooltip-trigger" awsui-tooltip-region="trigger" original-title="Type : ' + entity + ' - Confidence : ' + m  + '%">' + text + '</span></span></awsui-tooltip></span>';
            return newEntitiesSpan;
        }
        
        function getSentiment(source, language, isEndOfCall){
    
            var imgPositive = 'https://d2nmrh4p02w3u5.cloudfront.net/assets/06_ico_emoji_good.svg';
            var imgNegative = 'https://d2nmrh4p02w3u5.cloudfront.net/assets/01_ico_emoji_angry.svg';
            var imgMixed = 'https://d2nmrh4p02w3u5.cloudfront.net/assets/03_ico_emoji_meh.svg';
            var imgNeutral = 'https://d2nmrh4p02w3u5.cloudfront.net/assets/04_ico_emoji_neutral.svg';
            var imgSuperPositive = 'https://d2nmrh4p02w3u5.cloudfront.net/assets/07_ico_emoji_fantastic.svg';

            if (isEndOfCall) {
                $('#imgCurrentSentiment').attr('src',imgNeutral);
                return;
            }

            var comprehend = new AWS.Comprehend();
            var params = {
                LanguageCode: language,
                Text: source
            };
            comprehend.detectSentiment(params, function(err, data) {
                var imgTag = "#imgCurrentSentimentVoice";
                if (isChat) {
                    imgTag = "#imgCurrentSentimentChat"
                }

                if (err) {
                    console.log(err, err.stack);
                } else {
                 $('#currentSentiment').val(data.Sentiment);
                  sentiment = data.Sentiment;
                  if(data.Sentiment =='NEUTRAL')
                      $(imgTag).attr('src',imgNeutral);
                  else if (data.Sentiment == 'POSITIVE' && data.SentimentScore.Positive > .9885)
                      $(imgTag).attr('src',imgSuperPositive);
                  else if (data.Sentiment == 'POSITIVE')
                      $(imgTag).attr('src',imgPositive);
                  else if(data.Sentiment =='NEGATIVE')
                      $(imgTag).attr('src',imgNegative);
                  else
                      $(imgTag).attr('src',imgMixed);
                }
            });
            return;
        }

        function getOverallSentiment(text, language, endOfCall){
            var space = " ";
            entireTranscript = entireTranscript += space += text;
            language = language ? language : "en-US";
            $("#section-agent").show("slide");

            if (text) {
                if(entireTranscript.length > 0){
                    var source = entireTranscript;
                    var comprehend = new AWS.Comprehend();
                    var params = {
                        LanguageCode: language,
                        Text: source
                    };
                    comprehend.detectSentiment(params, function(err, data) {
                        if (err)
                            console.log(err, err.stack);
                        else {
                            if(endOfCall) {
                                var attributes = {};
                                var newSentiment = titleCase(data.Sentiment);
                                var sentimentScore = data.SentimentScore[newSentiment].toString(16);
                                attributes.transcriptLocation  = 'https://s3-' + getRegion() + '.amazonaws.com/' + getBucketName() + '/transcripts/' + contactId + ".txt" ;
                                attributes.customerSentiment = newSentiment;
                                attributes.customerSentimentScore = sentimentScore;
                                updateContactAttributes(attributes);
                                console.log('Writing into S3');
                                writeTranscriptToS3(entireTranscript);
                                resetSentimentBar();
                            } else {
                                refreshSentimentBar(data);
                            }
                        }
                    });
                    return;
                }
            } else if (endOfCall) {
                resetSentimentBar();
            }
        }
        
        function writeTranscriptToS3(transcript){
            try{
                var bucketName = getBucketName();
                var cId = contactId + ".txt";
                var S3=  new AWS.S3({params: {Bucket: bucketName + "/transcripts"}});
                var params = {
                  Key: cId,
                  ContentType:'text/plain',
                  Body: transcript,
                };
                S3.upload(params, function (err, res) {               
                    if(err)
                        console.log("Error in uploading file on s3 due to ", err);
                    else{    
                        console.log("File successfully uploaded.--> ", contactId );
                    }
                });
            }catch(e){
                console.log(e);
            }
            
        }
        

        function titleCase(str) {
            return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
        }

   
        var text = '{ "agentAssist" : [' +
            '{ "keyPhrase":"customer for two years" , "action":"Loyalty Program", "description":"Investigate customer loyalty offers" },' +
            '{ "keyPhrase":"Cancel My Service" , "action":"Offer Discount", "description":"Provide 30% discount for a year", "actionId":"3" },' +
            '{ "keyPhrase":"competitors website" , "action":"Competitive Advantage", "description":"Offer 25% discount for one year" },' +
            '{ "keyPhrase":"your competitors website" , "action":"Competitive Advantage", "description":"Offer 25% discount for one year" },' +
            '{ "keyPhrase":"match their price" , "action":"Price Match", "description":"Open price match details" },' +
            '{ "keyPhrase":"match the price" , "action":"Price Match", "description":"Open price match details" },' +
            '{ "keyPhrase":"New Service" , "action":"Offer Promo", "description":"Give 5% discount", "actionId":"3" },' +
            '{ "keyPhrase":"my invoice" , "action":"Send Most Recent Bill URL", "description":"Send recent bill link", "actionId":"1"},' +
            '{ "keyPhrase":"my bill" , "action":"Send Most Recent Bill URL", "description":"Send recent bill link", "actionId":"1"},' +
            '{ "keyPhrase":"the promotional pricing" , "action":"Promotion Extention", "description":"Renew promotional discount" } ]}';
        var agentAction = JSON.parse(text);
        console.log(agentAction);

        function getAgentAction(inputString, keyPhrase) {
            console.log(inputString);
            var action = '';
            agentAction.agentAssist.forEach(function (element) {
                var s1 = element.keyPhrase.toUpperCase();
                var s2 = inputString.toUpperCase();

                if (s2.search(s1) > -1) {
                    var patt = new RegExp(keyPhrase, "i");
                    var result = s1.match(patt);
                    if (result != null) {
                        $("#section-agent").show("slide");
                        $('.agentActionLabel').prepend(`<p class="suggestedActions" onclick="processActionEvent(${element.actionId})"> ${element.description} </p>`);
                        action = element.action;
                    }
                }

            });
            return action;
        }

        function processActionEvent(actionId) {
            console.log("in process action event");
            var message = "";
            switch(actionId) {
                case 1:
                    message = "You can find your most recent bill here: \nhttp://connectdemo.com/bills/latest";
                    break;
                case 3:
                    message = "This promotion includes a 5% discount for renewing your contract early.";
                    break;
                default:
                // code block
            }
            $('#agentResponseValue').val(message);
            return;
        }
  
    console.log("loading gauges");
    var bar = new ProgressBar.Line('.sentimentBar', {
        strokeWidth: 4,
        easing: 'easeInOut',
        duration: 1400,
        color: '#FFEA82',
        trailColor: '#eee',
        trailWidth: 1,
        svgStyle: {
            width: '100%',
            height: '100%'
        },
        from: {
            color: '#FF1414',
        },
        to: {
            color: '#32B232'
        },
        step: (state, bar) => {
            bar.path.setAttribute('stroke', state.color);
        }
    });

    var bar1 = new ProgressBar.Line('#sentimentBarChat', {
        strokeWidth: 4,
        easing: 'easeInOut',
        duration: 1400,
        color: '#FFEA82',
        trailColor: '#eee',
        trailWidth: 1,
        svgStyle: {
            width: '100%',
            height: '100%'
        },
        from: {
            color: '#FF1414',
        },
        to: {
            color: '#32B232'
        },
        step: (state, bar1) => {
            bar1.path.setAttribute('stroke', state.color);
        }
    });

    bar.animate(0); // Number from 0.0 to 1.0
    bar1.animate(0);

    function refreshSentimentBar(data) {
        var sentiment = data.SentimentScore.Positive;
        sentiment += data.SentimentScore.Neutral;
        bar.animate(sentiment);
        bar1.animate(sentiment);
    }

    function resetSentimentBar() {
        $('#imgCurrentSentiment').attr('src',
            'https://d2nmrh4p02w3u5.cloudfront.net/assets/04_ico_emoji_neutral.svg');
        bar.animate(0);
        bar1.animate(0);
        $("#section-agent").hide("slide");
        $(".agentActionLabel").innerHTML = "";
    }
   