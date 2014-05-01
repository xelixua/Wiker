/*jslint plusplus: true */

/*global kango, $, document, localization, KangoAPI, setTimeout, options_page_sample*/

KangoAPI.onReady(function () {
    "use strict";
    
    function initialize() {
        var localization = kango.i18n.getMessages(),
            options_page = $("body").html();
        
        options_page = options_page
            .replace('111111', localization["language_settings"])
            .replace('222222', localization["digital_settings"])
            .replace('333333', localization["color_settings"])
            .replace('AAAAAA', localization["pick_language"])
            .replace('BBBBBB', localization["default"])
            .replace('CCCCCC', localization["english"])
            .replace('DDDDDD', localization["russian"])
            .replace('EEEEEE', localization["ukrainian"])
            .replace('FFFFFF', localization["pick_what_you_want"])
            .replace('GGGGGG', localization["wikipedia"])
            .replace('HHHHHH', localization["yandex"])
            .replace('IIIIII', localization["wiki_ya"])
            .replace('JJJJJJ', localization["ya_wiki"])
            .replace('KKKKKK', localization["alt_settings"])
            .replace('LLLLLL', localization["buffer_size"])
            .replace('MMMMMM', localization["color_theme"])
            .replace('OOOOOO', localization["light"])
            .replace('PPPPPP', localization["dark"]);
        
        $("body").html(options_page);
        
        $("#wiki_language")
            .val(kango.storage.getItem("wiki_language"))
            .on("change", function (event) {
            var self = this;
            kango.storage.setItem("wiki_language", self.value);
        });
        $("#what_to_show")
            .val(kango.storage.getItem("what_to_show"))
            .on("change", function (event) {
            var self = this;
            kango.storage.setItem("what_to_show", self.value);
        });
        $("#alts_size_input")
            .val(kango.storage.getItem("buffer_size"))
            .on("change", function (event) {
            var self = this;
            kango.storage.setItem("buffer_size", self.value);
        });
        $("#buffer_size_input")
            .val(kango.storage.getItem("response_limit"))
            .on("change", function (event) {
            var self = this;
            kango.storage.setItem("response_limit", self.value);
        });
        $("#color_scheme")
            .val(kango.storage.getItem("color_scheme"))
            .on("change", function (event) {
            var self = this;
            kango.storage.setItem("color_scheme", self.value);
        });
    }
    
    initialize();
});