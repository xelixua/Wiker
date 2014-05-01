/*jslint plusplus: true */
/*global kango, chrome, XMLHttpRequest */

function set_def_buffer() {
    "use strict";
    kango.storage.clear();
    if (!kango.storage.getItem("state")) {
        kango.storage.setItem("state", "idle");
    }
    if (!kango.storage.getItem("buffer_size")) {
        kango.storage.setItem("buffer_size", 5);
    }
    if (!kango.storage.getItem("response_limit")) {
        kango.storage.setItem("response_limit", 20);
    }
    if (!kango.storage.getItem("what_to_show")) {
        kango.storage.setItem("what_to_show", "wiki-ya");
    }
    if (!kango.storage.getItem("card_color")) {
        kango.storage.setItem("card_color", "#FFFEB1");
    }
    if (!kango.storage.getItem("wiki_language")) {
        kango.storage.setItem("wiki_language", "def");
    }
    if (!kango.storage.getItem("color_scheme")) {
        kango.storage.setItem("color_scheme", "light");
    }
    kango.storage.setItem("language_disamb", {
        'en' : "may refer to:",
        'ru' : "означать",
        'uk' : 'Багатозн'
    });
    
    kango.storage.setItem("last_word", "");
    kango.ui.browserButton.setBadgeValue('');
}

function parseWord(word, callback) {
    "use strict";
    //get rid of special charachters in the beggining and in the ending of the word
    var start_expr = new RegExp("^[ -/]|[:-@]", "g"),
        end_expr = new RegExp("[ -/]|[:-@]$", "g");

    while (word.search(start_expr) !==  -1) {
        word = word.substr(1);
    }
    while (word.search(end_expr) !==  -1) {
        word = word.substr(0, word.length - 1);
    }
    callback(word);
}
function checkLanguage(word, callback) {
    "use strict";
	//returns true if the word is not in user native language
	var req = new XMLHttpRequest(),
        ya_query = 'https://translate.yandex.net/api/v1.5/tr.json/detect?key=trnsl.1.1.20130529T080613Z.e8f779995a22d86e.60ea3ff72f7d8687b3f1da14c449f6b4e5362edd&text=' + word,
        ya_response,
        ya_response_word;
    req.open('GET', ya_query, false);
	//var check_language_result = '';
	req.onreadystatechange = function () {
		if (this.readyState  ===  4) {
			ya_response = JSON.parse(req.responseText);
			if (ya_response.code  ===  200) {
				ya_response_word = JSON.stringify(ya_response.lang);
				if (ya_response_word.substring(1, 3) !== kango.i18n.getMessage('lang')) {
                    callback(true, word);
				} else {
                    callback(false, word);
				}
			} else { //Yandex detect languange query error
                switch (ya_response.code) {
                case 401:
                     //wrong API key
                    kango.console.log('WIST: Translation engine: wrong key. Contact developer');
                    callback(false);
                    break;
                case 402:
                    // API key is blocked
                    kango.console.log('WIST: Translation engine: key is blocked. Contact developer');
                    callback(false);
                    break;
                case 403:
                    //queries per day limit is reached (10 000 per day)
                    kango.console.log('WIST: Translation engine: word per day limit reached. Contact developer');
                    callback(false);
                    break;
                case 404:
                    //test value per day limit is reached (1 000 000 per day)
                    kango.console.log('WIST: Translation engine: text per day limit is reached. Contact developer');
                    callback(false);
                    break;
                }
            }
		}
	};
	req.send();
}

function translateWord(need_to_translate, word, callback) {
//translate the word if we need_to_translate
    "use strict";
	if (need_to_translate) {
		var translation_result = null,
            req = new XMLHttpRequest(),
            ya_query = 'https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20130529T080613Z.e8f779995a22d86e.60ea3ff72f7d8687b3f1da14c449f6b4e5362edd&lang=' + kango.i18n.getMessage('lang') + '&text=' + word,
            ya_response_word;
		req.open('GET', ya_query, false);
		req.onreadystatechange = function () {
			if (this.readyState  ===  4) {
				var ya_response = JSON.parse(req.responseText);
				if (ya_response.code  ===  200) {
                    ya_response_word = JSON.stringify(ya_response.text);
					translation_result = ya_response_word.substr(2, ya_response_word.length - 4);
					if (typeof (callback) !== 'undefined') {
                        callback(translation_result);
                    }
				} else { //Yandex translate query error handle
                    switch (ya_response.code) {
                    case 413:
                        //Maximum text value per day is reached
				        kango.console.log('WIST: maximum text value per day is reaced. Contact developer');
                        return translation_result;
				    case 422:
                        //Cannot translate text
                        kango.console.log('WIST: cannot translate text');
                        return translation_result;
				    case 501:
                        //Translation direction is not supported
						kango.console.log('WIST: cannot translate text to your language');
						return translation_result;
                    }
				}
			}
		};
		req.send();
	} else {
        callback(null);
    }
}

function checkWordBuffer(word) {
    "use strict";
    var is_word = kango.storage.getItem(word);
    if (is_word && is_word.wiki_response !== '') {
        return true;
    } else {
        return false;
    }
}

function askWikipedia(word, mode, callback, re_request) {
	//mode 0 - standart query; 1 - return full extracts section (for disambiguation pages)
	//mode 2 - to show wikipedia links 
	//var resp=""; //parsed text of wiki-response
    "use strict";
    var url,
        lang,
        one_unit,
        response_limit = kango.storage.getItem("response_limit"),
        buffer_size = kango.storage.getItem("buffer_size"),
        wiki_response = '',
        word_data,
        xrequest,
        allkeys,
        i,
        buffered_words = 0,
        this_word_translated,
        item,
        common_url = '.wikipedia.org/w/api.php?action=query&indexpageids&format=json&redirects&prop=extracts|categories&exsentences=2&exintro&list=allpages&explaintext&aplimit=' + response_limit + '&apprefix=' + word + '&titles=' + word;
    
	//forming url
	if (!checkWordBuffer(word) || (typeof (re_request) !== undefined && re_request)) {
		//make query to wikipedia and record word to word buffer
		if (kango.storage.getItem("wiki_language") === 'def') {
			url = 'http://' + kango.i18n.getMessage('en_wikipedia_org') + common_url;
		} else {
            lang = kango.storage.getItem("wiki_language");
            url = 'http://' + lang + common_url;
        }
		
		if (mode  >  0) {
			switch (mode) {		//if it is a disambiguation page,we need to get full extracts section
            case 1:
                url = url.replace('|categories', '');
				break;
			case 2:
				if (kango.storage.getItem("wiki_language") === 'def') {
					url = 'http://' + kango.i18n.getMessage('wiki_language') + '/w/api.php?action=parse&format=json&prop=links&page=' + word;
				} else {
                    lang = kango.storage.getItem("wiki_language");
                    url = 'http://' + lang + '.wikipedia.org/w/api.php?action=parse&format=json&prop=links&page=' + word;
				}
                break;
            }
		}
	//making request
		xrequest = new XMLHttpRequest();
		xrequest.open('GET', url, false);
		xrequest.onreadystatechange = function () {
			if (this.readyState  ===  4) {
				if (this.status  ===  200 && this.responseText) { // Error check for fetching the URL
					wiki_response = JSON.parse(xrequest.responseText);
                    if (wiki_response) {
                        //control buffer size
                        allkeys = kango.storage.getKeys();
                        for (i = 0; i < allkeys.length; i++) {
                            item = allkeys[i];
                            if (item !== 'buffer_size' && item !== 'language_disamb' && item !== 'response_limit' && item !== 'state') {
                                buffered_words++;
                            }
                        }
                        if (buffered_words === buffer_size) {
                            set_def_buffer();
                        }
                        if (kango.storage.getItem(word)) {
                            this_word_translated = '';
                        }
                        if (typeof (re_request) !== undefined && re_request) {
                            wiki_response[response_limit + 1] = kango.storage.getItem("wiki_language");
                        }
                        one_unit = {
                            translated: this_word_translated,
                            wiki_response: wiki_response,
                            wiki_response_translated: '',
                            parsed_response: ''
                        };
                        word_data = JSON.stringify(one_unit);
                        kango.storage.setItem(word, word_data);
                        kango.storage.setItem("last_word", word);
						callback(wiki_response);
                    } else {
                        kango.console.log('No response from wikipedia');
                        //переслать в parsewikiresponse что википедия не ответила
                    }
				} else {
                    kango.console.log('WIST: Can\'t read ' + url);
				}
			}
		};
		xrequest.send();
	} else {
        word_data = JSON.parse(kango.storage.getItem(word));
        callback(word_data.wiki_response);
        kango.console.log('Taken from buffer');
    }
}

function parseWikiResponse(word, json_reply, callback) {  //make use wikipedia's json
	//returns an array with next format:
	//[standart response],[alternative responses number],[alt resp 1]...[alt resp n]
    "use strict";
    var its_length,
        redirected_query,
        temp_lang,
        another_lang_query_en,
        response = [],
        page_id,
        response_limit = kango.storage.getItem("response_limit"),
        language_disamb_regexp,
        cat_count,
        service_inf = new RegExp("\\[.+\\]", "g"),
		control_symb =  new RegExp("\\t|\\n", "g"),
        links,
        localization = kango.i18n.getMessages(),
        language_disamb = kango.storage.getItem("language_disamb"),
        language_disamb_thislang = JSON.stringify(kango.storage.getItem("language_disamb")[localization['lang']]),
        i;
	
	if (typeof (json_reply) !==  'undefined' && typeof (json_reply.query) !==  'undefined') {
		if (false/*typeof (json_reply.query.redirects) !==  'undefined'*/) {
            //if the page has another title
			its_length = json_reply.query.redirects[0].to.length;
			redirected_query = JSON.stringify(json_reply.query.redirects[0].to).substr(1, its_length);
			askWikipedia(redirected_query, 0, function (wiki_response_1) {
				parseWikiResponse(redirected_query, wiki_response_1, function (result) {
					redirected_query = result;
					if (redirected_query) {
						callback(redirected_query);
						return;
					}
				});
			}, true);
		} else {
            if (json_reply.query.pageids[0] === '-1') {
                // nothing found, try to check categories
                askWikipedia(word, 2, function (new_json_reply) {
                    kango.console.log("i want to see error " + JSON.stringify(new_json_reply.error));
                    if (typeof (new_json_reply.error) === 'undefined') {
                        kango.console.log('tratata' + JSON.stringify(new_json_reply.parse.links));
                        links = new_json_reply.parse.links;
                        for (i = 1; i < links.length; i++) {
                            response[2 + i] = links[i]["*"];
                        }
                        response[0] = json_reply.query.pages[0].extract;
                        response[1] = links.length || json_reply.query.allpages.length;
                        response[response_limit + 1] = 'def';
                        kango.ui.browserButton.setBadgeValue(response[1]);
                        kango.storage.setItem('state', 'list');
                        callback(response);
                        return;
                    } else {
                        // nothing found, try in another language
                        kango.console.log("Trying in another language");
                        if (kango.storage.getItem("wiki_language") !== 'en' && !(kango.storage.getItem("wiki_language")  ===  'def' && kango.i18n.getMessage('lang')  ===  'en')) {
                            if (kango.storage.getItem("wiki_language") !== 'ru' && !(kango.storage.getItem("wiki_language") === 'def' && kango.i18n.getMessage('lang') === 'ru')) {
                                temp_lang = kango.storage.getItem("wiki_language");
                                kango.storage.setItem("wiki_language", 'ru');
                                askWikipedia(word, 0, function (new_json_reply) {
                                    parseWikiResponse(word, new_json_reply, function (another_lang_query_ru) {
                                        kango.storage.setItem("wiki_language", temp_lang);	//return wikipedia language 
                                        if (typeof (another_lang_query_ru) !== 'undefined') {
                                            callback(another_lang_query_ru);
                                            return;
                                        }
                                    });
                                }, true);
                            } else {
                                temp_lang = kango.storage.getItem("wiki_language");
                                kango.console.log('temp_lang ' + temp_lang);
                                kango.storage.setItem("wiki_language", 'en');
                                kango.console.log('language ' + kango.storage.getItem('wiki_language'));
                                askWikipedia(word, 0, function (new_json_reply) {
                                        parseWikiResponse(word, new_json_reply, function (another_lang_query_en) {
                                        kango.storage.setItem("wiki_language", temp_lang);	//return wikipedia language 
                                        kango.console.log('language after' + kango.storage.getItem('wiki_language'));
                                        if (typeof (another_lang_query_en) !== 'undefined') {
                                            callback(another_lang_query_en);
                                            return;
                                        }
                                    });
                                }, true);
                            }
                        } else {
                            response[0] = '';
                            response[1] = 0;
                            response[response_limit+1] = 'def';
                            callback(response);
                        }
                    }
                }, true);
			} else {
                // got an answer, let's compose it
				page_id = JSON.parse(json_reply.query.pageids[0]);
				kango.console.log(JSON.stringify(json_reply.query.pages[page_id]));
				
                if (typeof (json_reply.query.pages[page_id].extract) !== 'undefined') {
                    response[0] = JSON.stringify(json_reply.query.pages[page_id].extract.replace(service_inf, '').replace(control_symb, ''));
                    response[0] = response[0].substr(1, response[0].length - 2);
                }
                
                if (response[0].search(language_disamb_thislang) !== -1) {
                    //response[0] = localization["check_popup"];
                    kango.console.log(language_disamb_thislang + ' ' + response[0].search(language_disamb_thislang));
                }
				
				//Check if there are another pages with same name
				response[1] = json_reply.query.allpages.length;
				if (json_reply.query.allpages.length > 1) { //allpages is an array
					for (i = 0; i < json_reply.query.allpages.length; i++) {
						response[2 + i] = JSON.stringify(json_reply.query.allpages[i].title);
						response[2 + i] = response[2 + i].substr(1, response[2 + i].length - 2);
					}
				}
				response[response_limit + 1] = 'def'; //we got answer from wikipedia in user setted language
				callback(response);
			}
		}
	} /*else {
        response[0] = '';
        response[1] = 0;
        callback(response);
    }*/
}

function prepareReply(word, translation_result, parsed_wiki_response) {
    "use strict";
	kango.storage.setItem("state", 'list');
	var data = {
		word: word,
		translated_word: translation_result,
		word_meaning: parsed_wiki_response
	};
	kango.browser.tabs.getCurrent(function (tab) {
		// tab is KangoBrowserTab object
		tab.dispatchMessage("drawResponseCard", data);
	});
}


kango.addMessageListener('ProcessWord', function (event) {
    // event.data - point to data attached
    // event.target - point to the KangoBrowseTab object that sent the message
    "use strict";
	var content = event.data,
        word = content.data,
        popup = event.data.popup,
        target = event.target,
        one_unit,
        translated_word,
        send_data;
	parseWord(word, function (parsed_word) {
		askWikipedia(word, 0, function (wiki_response) {
            kango.console.log(JSON.stringify(wiki_response));
			parseWikiResponse(word, wiki_response, function (parsed_response) {
                checkLanguage(parsed_word, function (need_to_translate, parsed_word) {
                    translateWord(need_to_translate, parsed_word, function (translated_word) {
				        kango.console.log('Parsed wikipedia response: ' + parsed_response);
                        one_unit = kango.storage.getItem(word);
                        one_unit.parsed_response = parsed_response;
                        kango.storage.setItem(word, one_unit);
                        //var word_data = kango.storage.getItem(word);
                        //kango.console.log("Translated word " + translated_word);
                        
                        if (typeof (popup) === 'undefined' || !popup) {
                            kango.console.log('Lets prepare reply');
                            prepareReply(word, translated_word, parsed_response);
                            kango.storage.setItem('temp_html', null);
                            kango.storage.setItem("last_word", word);
                        } else {
                            if (!parsed_response[0]) {
                                kango.dispatchMessage('printAlternativesList');
                            } else {
                                send_data = {
                                    word: parsed_word,
                                    response: parsed_response[0]
                                };
                                kango.dispatchMessage('printPopup', send_data);
                            }
                        }
                        if (translated_word) {
                            one_unit = kango.storage.getItem(word);
                            one_unit.translated = translated_word;
                            kango.storage.setItem(word, one_unit);
                        }
                        //if (kango.storage.getItem('state') !== 'response') {
                        if (parsed_response[1] > 1) {
                            kango.storage.setItem("state", "list");
                            kango.ui.browserButton.setBadgeValue(parsed_response[1]);
                        } else {
                            if (parsed_response[1] === 1) {
                                kango.console.log("Adyn adyn");
                                kango.storage.setItem("state", "response");
                            } else { // wiki_response [1] === 0
                                kango.ui.browserButton.setBadgeValue('');
                                kango.storage.setItem("state", "idle");
                            }
                        }
                      // }
                    });
                });
			});
		});
	});
});

kango.addMessageListener('loadFileSamles', function (event) {
    "use strict";
	var req = new XMLHttpRequest(),
        response,
        translation,
        css,
        sample_card,
        localization,
        options_page,
        data;
    
    req.open('GET', chrome.extension.getURL('attachements/response_block.html'), false);
    req.send();
	response = req.responseText;
	
	req = new XMLHttpRequest();
	req.open('GET', chrome.extension.getURL('attachements/translate_block.html'), false);
	req.send();
	translation = req.responseText;
	
	req = new XMLHttpRequest();
    if (kango.storage.getItem("color_scheme") == 'light') {
        req.open('GET', chrome.extension.getURL('styles/response_block.css'), false);
    } else {
        req.open('GET', chrome.extension.getURL('styles/response_block_dark.css'), false);
    }
    req.send();
	css = req.responseText;
	
	req = new XMLHttpRequest();
	req.open('GET', chrome.extension.getURL('attachements/blank_response_block.html'), false);
	req.send();
	sample_card = req.responseText;
    
    req = new XMLHttpRequest();
	req.open('GET', chrome.extension.getURL('options.html'), false);
	req.send();
	options_page = req.responseText;

    localization = kango.i18n.getMessages();
	
	data = {
		response_block: response,
		translation_block: translation,
		css_block: css,
		sample_card: sample_card,
        localization: localization,
        options_page: options_page,
        response_limit: kango.storage.getItem('response_limit'),
        what_to_show: kango.storage.getItem("what_to_show"),
        card_color: kango.storage.getItem("card_color")
	};
	
	kango.browser.tabs.getCurrent(function (tab) {
		tab.dispatchMessage("takeFileSamples", data);
	});
});

set_def_buffer();
kango.storage.setItem("temp_html", null);
kango.storage.setItem('previous_state', null);