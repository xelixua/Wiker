/*jslint plusplus: true */

/*global kango, $, document, localization, KangoAPI, setTimeout*/

KangoAPI.onReady(function () {
    "use strict";
    var localization = kango.i18n.getMessages(),
        wiki_page,
        lang = kango.storage.getItem("wiki_language"),
        disamb = '(значения)|(значення)|(disambiguation)';
    
    function malicious(sub) {
        var disamb_words = disamb.split('|'),
            z,
            x,
            test_string;
        
        for (z = 0; z < disamb_words.length; z++) { //word by word
            x = sub.length - disamb_words[z].length;
            test_string = sub.substr(x);
            if (test_string === disamb_words[z]) {
                return true;
            }
        }
        return false;
    }
    
    function bindListeners() {
        var word = kango.storage.getItem("last_word"),
            state = kango.storage.getItem('state'),
            lang = kango.storage.getItem("wiki_language"),
            wiki_page;
        
        if (state === 'list') {
            $(".altlink").on("click", function () {
                var self = this;
                $("#progressbar").animate({
                    'width': '300px'
                }, 400);
                setTimeout(function () {
                    var i,
                        message_data = {
                            data: self.innerHTML,
                            popup: true
                        };
                    kango.storage.getItem('temp_html');
                    kango.storage.setItem('state', 'response');
                    kango.dispatchMessage('ProcessWord', message_data);
                }, 400);
            });
            $(".direct_link").on("click", function () {
                wiki_page = 'https://' + lang + '.wikipedia.org/wiki/' + this.innerHTML;
                kango.browser.tabs.create({url: wiki_page});
            });
            $("#clear").on("click", function () {
                $("body")
                    .html('<div id="defaultd"><font class="defaultf"><b>Wiker</b> - ' + localization['popup_def'] + '</font></div>')
                    .append('<input type="text" id="popup_query" size="30" value="' + localization['enter_your_query_here'] + '"><input type="button" disabled value="' + localization['what_is_it'] + '"></br></br>');
                kango.storage.setItem('state', 'idle');
                kango.storage.setItem('temp_html', $("body").html());
                bindListeners();
                kango.ui.browserButton.setBadgeValue('');
            });
        } else {
            $("#back_to_alternatives")
                .on("click", function () {
                    kango.storage.setItem('state', 'list');
                    $("body").html(kango.storage.getItem('temp_html'));
                    bindListeners();
                });

            $("#open_full")
                .on("click", function () {
                    var lang = kango.storage.getItem('wiki_language'),
                        wiki_page;
                    
                    if (lang === 'def') {
                        wiki_page = 'https://' + localization['en.wikipedia.org'] + '.wikipedia.org/wiki/' + word;
                    } else {
                        wiki_page = 'https://' + lang + '.wikipedia.org/wiki/' + word;
                    }
                    //chrome.tabs.create({'url': wiki_page});
                    kango.browser.tabs.create({url: wiki_page});
                });

            $("input[type='text']")
                .on("click", function (event) {
                    this.value = '';
                    $("input[type='button']").removeAttr('disabled');
                })
                .on("keypress", function (event) {
                    var message_data,
                        word = $("input[type='text']").val();
                    $("input[type='button']").removeAttr('disabled');
                    if (event.keyCode === 13) {
                        if (word === 'privet') {
                            kango.browser.tabs.create({url: 'https://www.youtube.com/watch?v=2KI0dVWwqqo'});
                        } else {
                            message_data = {
                                data: word,
                                popup: true
                            };
                            kango.dispatchMessage('ProcessWord', message_data);
                        }
                    }
                });

            $("input[type='button']").on("click", function () {
                var word = $("input[type='text']").val(),
                    message_data = {
                        data: $("input[type='text']").val(),
                        popup: true
                    };
                if (word === 'privet') {
                    kango.browser.tabs.create({url: 'https://www.youtube.com/watch?v=2KI0dVWwqqo'});
                } else {
                    kango.dispatchMessage('ProcessWord', message_data);
                }
            });
        }
    }
    
    function printAlternativesList() {
        var i,
            word = kango.storage.getItem("last_word"),
            page_id = JSON.parse(kango.storage.getItem(word)).wiki_response.query.pageids[0],
            alternatives = JSON.parse(kango.storage.getItem(word)).wiki_response.query.allpages,
            innerhtml,
            message_data,
            disamb = /\u1079\u1085\u1072/g,
            alt_class = 'altlink';

        if (!alternatives.length) {
            alternatives = JSON.parse(kango.storage.getItem(word)).wiki_response.query.pages[page_id].categories;
            alt_class = "direct_link";
            innerhtml = '<div id="yapr"><font class="yapr">' + localization['cats'] + '</font></div></br>';
        } else {
            innerhtml = '<div id="yapr"><font class="yapr">' + localization['You_are_probably_looking_for'] + '</font></div></br>';
        }
        //kango.console.log(alternatives.length);
        if (alternatives.length === 1) {
            var message_data = {
                data: alternatives[0].title,
                popup: true
            };
            kango.storage.setItem('state', 'response');
            kango.dispatchMessage('ProcessWord', message_data);
        }
        
        innerhtml += '<div id="alt_links"><font class="alt_links">';
        for (i = 0; i < alternatives.length; i++) {
            if (!malicious(alternatives[i].title)) {
                    innerhtml += '</br>' + '<a href="#" class="' + alt_class + '">' + alternatives[i].title + '</a>';
            }
        }
        innerhtml += '</font></div><div id="progressbar"></div>' + '<br><br><a id="clear" href="#"><font class="closelink">' + localization['Clear_list'] + '</font></a>';
        $("body").html(innerhtml);
        bindListeners();
        kango.storage.setItem('temp_html', $("body").html());
    }

    function printPopup(event) {
        var word = event.data.word,
            response = event.data.response,
            message_data,
            wiki_page,
            coords = new RegExp("^\\d{2}.\\d{4}\\d?\\d?, \\d{2}.\\d{4}\\d?\\d?"),
            coordsX, 
            coordsY,
            ya_maps_link,
            defis_pos;
        
        //kango.console.log(response.trim().search(coords));
        if (response.search(coords) !== -1) {
            coords = response.split(",");
            coordsX = coords[1].trim();
            coordsY = coords[0].trim();
            ya_maps_link = 'http://static-maps.yandex.ru/1.x/?ll=' + coordsX + ',' + coordsY + '&size=300,300&z=15&l=map&pt=' + coordsX + ',' + coordsY + ',pm2blm';
            response = '<img src=' + ya_maps_link + '></img>';
        }
        
        $("body")
            .html('<div id="back_to_alternatives"></div>')
            .append('<div id="wiki_response"></div>')
            .append('<br>')
            .append('<div id="translate_reply"></div>')
            .append('<br>')
            .append('<div id="open_full"></div>')
            .append('<br>')
            .append('<div id="manual_query_entry"></div>');

        $("#back_to_alternatives")
            .html('<a href="#"><font class="back_to_list">&#x2190 ' + localization['show_alternative_meanings'] + '<font></a>');
        
        $("#wiki_response")
            .html('<font class="wiki_response"><b>' + word + '</b> - ' + response + '</font><br>');

        $("#open_full")
            .html('<a href="#"><font class="open_full">' + localization['open_full_article_in_a_new_tab'] + ' &#x2192</font></a>');

        $("#manual_query_entry")
            .html('<input type="text" id="popup_query" size="30" value="' + localization['enter_your_query_here'] + '"><input type="button" disabled value="' + localization['what_is_it'] + '"></br></br>');

        bindListeners();
        kango.storage.setItem('temp_html_response', $("body").html());
    }
    
    (kango.storage.getItem('state'));
    if (kango.storage.getItem("state") === 'idle') {
        $("body")
            .html('<div id="defaultd"><font class="defaultf"><b>Wiker</b> - ' + localization['popup_def'] + '</font></div>')
            .append('<input type="text" id="popup_query" size="30" value="' + localization['enter_your_query_here'] + '"><input type="button" disabled value="' + localization['what_is_it'] + '"></br></br>');
        bindListeners();
    }
    
    kango.addMessageListener('printPopup', function (event) {
        kango.storage.setItem('state', 'response');
        printPopup(event);
    });
    kango.addMessageListener('printAlternativesList', function (event) {
        kango.storage.setItem('state', 'list');
        printAlternativesList();
    });

    if (!kango.storage.getItem('temp_html')) {
        kango.storage.setItem('state', 'list');
        printAlternativesList();
    } else {
        //kango.console.log('from_temp');
        if (kango.storage.getItem('state') === 'response') {
            $("body").html(kango.storage.getItem('temp_html_response'));
        } else {
            $("body").html(kango.storage.getItem('temp_html'));
        }
        bindListeners();
    }
});