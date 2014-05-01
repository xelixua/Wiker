/*global kango, window, $, document, xpos, ypos, page_width, response_block_sample, translate_block_sample, css_block_sample, sample_card, localization, response_limit, what_to_show, card_color, allow_to_change_mouse_coords */

// ==UserScript==
// @name onpage
// @include http://*
// @include https://*
// @require jquery-1.11.0.min.js
// @require jquery-ui-1.10.4.custom.js
// ==/UserScript==

var xpos,
    ypos,
    page_width,
    response_block_sample,
    translate_block_sample,
    css_block_sample,
    sample_card,
    localization,
    response_limit,
    what_to_show,
    card_color,
    allow_to_change_mouse_coords = true;

function loadFileSamples() {
    
	var data;
	kango.dispatchMessage('loadFileSamles', data);

}


function sendMouseCoordToMain() {
    
	var selection = window.getSelection().toString(),
        message_data;
	if (selection) {
		kango.console.log('Selection is ' + selection);
	} else {
        kango.console.log('Nothing was selected');
    }
		
	if (selection  !==  'undefined' && xpos  !==  'undefined' && ypos  !==  undefined) {
		kango.console.log(xpos + ',' + ypos);
		message_data = {
			data: selection
		};
		
		kango.dispatchMessage('ProcessWord', message_data);
		kango.console.log('send message to main');
	}
}

var map = {16: false, 49: false};
$(document).keydown(function (e) {
    kango.console.log("Key pressed");
    if (e.keyCode in map) {
        map[e.keyCode] = true;
        if (map[16] && map[49]) {
			sendMouseCoordToMain();
            allow_to_change_mouse_coords = false;
        }
    }
}).keyup(function (e) {
    
    if (e.keyCode in map) {
        map[e.keyCode] = false;
    }
});

$(document).mousemove(function (event) {
    
    if (allow_to_change_mouse_coords) {
        xpos = event.pageX;
        ypos = event.pageY;
    }
});

kango.addMessageListener('drawResponseCard', function (event) {
    
    // event.data - the data sent with message
	kango.console.log('Received drawResponseCard message from main');
	var word                   = event.data.word,
        translation_result     = event.data.translated_word,
        word_meaning           = event.data.word_meaning,
        response_block,
        translation_block,
        temp_array,
        response_title,
        response_text,
        caption_html,
        css_height,
        css_left,
        css_top,
        css_right,
        css_bottom,
        response_css,
        coords = new RegExp("^\\d{2}.\\d{4}\\d?\\d?, \\d{2}.\\d{4}\\d?\\d?");
    
    kango.console.log(word_meaning[0]);
//---------------------------HTML----------------------------------------------
//-----------------------------------------------------------------------------
	//--------------------------------------------- // getting wikipedia response block
	if (typeof (response_block_sample)  !==  'undefined') {
        response_block = response_block_sample;
    }
		
    response_title = word;
    /*if (!word_meaning[0]) {
        response_text = '<i>' + localization['check_popup'] + '</i>';
    } else {*/
        if (word_meaning[0].search(coords) !== -1) {
            response_text = '<i>' + localization['coords_check_popup'] + '</i>';
        } else {
            response_text = word_meaning[0]/*.substr(word.length).trim()*/;
        }
    //}
	
	caption_html = '<b>' + response_title + '</b>';
    //---------------------------------------//let's show user that he got an answer from wikipedia in another language
	if (word_meaning[response_limit + 1] !== 'def') {
        
		switch (word_meaning[response_limit + 1]) {
        case 'ru':
            caption_html += ' <i>(' + localization['used_russian_wiki'] + ')</i>';
            break;
		case 'en':
            caption_html += ' <i>(' + localization['used_english_wiki'] + ')</i>';
            break;
		}
	}
	$("#capt_jwist").html(caption_html);
	if (word_meaning[1] === 0) {
		$("#resp_jwist").html('<i>' + localization["nothing_found_in_wikipedia"] + '</i>');
	} else {
        $("#resp_jwist").html(response_text);
		//------------------------------------------------// several results block
        if (word_meaning[1] > 1) {
            $("#resp_jwist").append('<div><i>' + localization["the_word_has_several_meanings"] + '</i></div>');
		}
		
		//----------------------------------------------- // yandex translation block
		
        kango.console.log('Translation block ' + translate_block_sample);
        if (translation_result && typeof (translate_block_sample)  !==  'undefined' && word.trim() !== translation_result) {
            translation_block = translate_block_sample;
            kango.console.log("Translation result: " + translation_result);
            if (what_to_show === 'wiki-ya' || what_to_show === 'ya-wiki') {
                if (what_to_show === 'wiki-ya') {
                    translation_block = translation_block.replace('AAAAAA', word);
                    translation_block = translation_block.replace('BBBBBB', translation_result);
                    $("#resp_jwist").append(translation_block);
                } else {
                    $("#resp_jwist").prepend('<div id="tranlated_block">' + word + '-' + translation_result + '</div>');
                }
            }
        }
    }
//---------------------------CSS-----------------------------------------------
//-----------------------------------------------------------------------------

    css_height = $("#caption_content").height + $("#response_content").height + 10;
	if (typeof (css_block_sample) !== 'undefined') {
        response_css = css_block_sample;
    }
    //set css position of element depenging of position of page
	if (xpos + 528 < $("body").width) {
        if (ypos + css_height < $("body").height) {
            css_left = (xpos + 20).toString();
            css_top = (ypos + 20).toString();

            if (typeof (response_css) !== 'undefined') {
                response_css = response_css.replace('AAAAAA', css_height);
                response_css = response_css.replace('BBBBBB', css_left);
                response_css = response_css.replace('CCCCCC', css_top);
                response_css = response_css.replace('YYYYYY', card_color);
            }
        } else {
            css_left = (xpos + 20).toString();
            css_bottom = ($("body").height - 20).toString();

            if (typeof (response_css) !== 'undefined') {
                response_css = response_css.replace('AAAAAA', css_height);
                response_css = response_css.replace('BBBBBB', css_left);
                response_css = response_css.replace('XXXXXX', css_bottom);
                response_css = response_css.replace('YYYYYY', card_color);
            }
        }
    } else {
        if (ypos + css_height < $("body").height) {
            css_right = (20).toString();
            css_top = (ypos + 20).toString();

            if (typeof (response_css) !== 'undefined') {
                response_css = response_css.replace('AAAAAA', css_height);
                response_css = response_css.replace('ZZZZZZ', css_right);
                response_css = response_css.replace('CCCCCC', css_top);
                response_css = response_css.replace('YYYYYY', card_color);
            }
        } else {
            css_right = (xpos - 20).toString();
            css_bottom = ($("body").height - 20).toString();

            if (typeof (response_css) !== 'undefined') {
                response_css = response_css.replace('AAAAAA', css_height);
                response_css = response_css.replace('ZZZZZZ', css_right);
                response_css = response_css.replace('XXXXXX', css_bottom);
                response_css = response_css.replace('YYYYYY', card_color);
            }
        }
    }
	//now the response div is filled with content, let's add it's styles and show the response
	$("head").append('<style type="text/css">' + response_css + '</style>');
	$("#base_jwist").attr('style', 'display:inline').draggable();
    allow_to_change_mouse_coords = true;
    kango.console.log(response_css);
});

kango.addMessageListener('takeFileSamples', function (event) {
    
	response_block_sample      = event.data.response_block;
	translate_block_sample     = event.data.translation_block;
	css_block_sample           = event.data.css_block;
	sample_card                = event.data.sample_card;
    localization               = event.data.localization;
    response_limit             = event.data.response_limit;
    what_to_show               = event.data.what_to_show;
    card_color                 = event.data.card_color;
    
    kango.console.log(translate_block_sample);
    kango.console.log(localization);
	
	//setting empty invisible response block at the end of the page
	$("body").append(sample_card);
    $("#close_card").on("click", function (event) {
        $("#base_jwist").attr('style', 'display:none');
    });
});

$(document).ready(loadFileSamples());
kango.console.log("Loaded");